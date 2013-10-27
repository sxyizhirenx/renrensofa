var assert=require('assert');
var StateThief=require('./stateSource.js').INST;
var Request=require('node-request');
var Step=require('step');
var querystring=require('querystring');


/**
 * 处理类
 * @constructor
 */
var Hand=function(){
    var LoginInfo;  //cookie等登录信息
    var token;      //pagetoken
    var PageList;   //要查询的留言板列表
    var callbackFn; //回调函数，有新留言时调用
    var stateSourceMap;    //记录最新状态id的map
    var poster;     //回复状态的处理类
    ////////////////////
    var numPerGet=1;                    //每次获取条数
    var stateIntervalTime = 20;         //扫描状态的时间间隔
    var cookieExpireTimes;              //cookie失效次数，到达一定次数就要发送失效消息出去
    var autoReplyList;
    var index=0;    //沙发序号，第几次沙发

    ///////////////////
    /**
     * 初始化，配置一些参数
     * @param loginInfo
     * @param pageList
     */
    this.init=function(loginInfo,pageList,msgList,replyindex){
        assert(pageList instanceof Array);
        assert(msgList instanceof Array);
        assert(typeof loginInfo === 'object');
        LoginInfo=loginInfo;
        token=LoginInfo.token;
        PageList=pageList;
        autoReplyList=msgList;
        cookieExpireTimes=0;
        poster=new Poster(LoginInfo);
        //读取历史沙发次数
        if(typeof replyindex === 'number'){
            index=replyindex;
        }
    }

    /**
     * 开始工作
     * @param callback
     */
    this.run=function(callback){
        assert(typeof callback === 'function');
        callbackFn=callback;
        process.nextTick(Doing);
    }

    /**
     * 工作内容
     * @constructor
     */
    var Doing=function(){
        setStateSource(PageList);
        getNewState();
    }

    /**
     * 设置要监视状态的主页的id列表
     * @param gsList
     */
    var setStateSource=function(gsList){
        stateSourceMap={};
        if(gsList instanceof Array){
            for(var i=0;i<gsList.length;i++){
                var gs=gsList[i];
                stateSourceMap[gs]={
                    lastId:0,
                    gsThief:new StateThief()
                };
            }
        }
    }
    /**
     * 从用户的状态中读取状态
     * @param pageid
     */
    var getNewState=function(pageid){
        if(!pageid){
            var tm=1000;
            for(var i in stateSourceMap){
                setTimeout(getNewState,tm,i);
                tm +=1000;
            }
        }else{
            stateSourceMap[pageid].gsThief.getStateList(pageid,LoginInfo.Cookie,numPerGet,getStateCallback);
        }
    }

    var countExpire=function(gsList){
        //gsList=[];//用于测试该功能
        if(0 == gsList.length){
            console.log('cookie invalid a time!');
            cookieExpireTimes ++;
        }else{
            cookieExpireTimes = 0;
        }
        if(cookieExpireTimes > PageList.length){
            //平均每个页面都失效就判定为cookie失效了
            callbackFn('cookie expire',cookieExpireTimes);
        }
    }

    /**
     * 处理从状态（只读别人的）中读来的信息，符合要求就放到发送列表中
     * @param pageId
     * @param gsList
     */
    var getStateCallback=function(pageId,gsList){
        if(stateSourceMap[pageId] && (gsList instanceof Array)){//返回的参数正常的话
            countExpire(gsList);
            for(var i=gsList.length-1;i>=0;i--){    //遍历留言数组，从id最小的开始，逆序遍历
                var k = gsList[i]   //数组的某一项
                if(k.id > stateSourceMap[pageId].lastId){//id有增长，说明有新的state
                    if(stateSourceMap[pageId].lastId === 0){
                        //0是初始化时的lastId
                        //第一条不处理了，简化逻辑
                    }else{
                        var idx=Math.floor(Math.random() * autoReplyList.length);
                        var timeTail;
                        if(index){
                            timeTail='【第'+index+'次沙发】保护环境,爱护小动物';

                            index++;
                            callbackFn(undefined,{type:'index',value:index});
                        }else{
                            timeTail='【'+Date().replace(/.*?(2013 .*?) .*/,'$1') + '记】';
                        }

                        var replyMsg=autoReplyList[idx];
                        k.replyMsg=replyMsg+timeTail;

                        poster.addReply(k);
                    }
                    stateSourceMap[pageId].lastId= k.id;
                }

            }

        }
        setTimeout(getNewState,stateIntervalTime * 1000,pageId);
    }


}


function Poster(loginInfo){
    var LoginInfo=loginInfo;
    var token=LoginInfo.token;
    var postList=[];   //要post的对象
    var lock=false;       //http lock
    var dftWaitTime=1000;
    var visitPostTime=15;   //20s


    this.addReply=function(sofainfo){
        var msgBlock=buildOneStateReplyBlock(sofainfo);
        postList.push(msgBlock);
    }


    /**
     * 构建一条状态回复信息，并非构建一般的回复消息
     * @param k
     * @return {Object}
     */
    var buildOneStateReplyBlock=function(k){
        //k.id, k.owner
        var msgblock={
            submit:'http://status.renren.com/feedcommentreply.do',
            parameter:{
                't': 3,
                'rpLayer': 0,
                'replyref':'newsfeed',
                'source':k.id,      //doingID
                'owner':k.owner,    //ownerID
                'c':k.replyMsg,
                '_rtk':token._rtk,
                'requestToken':token.requestToken,
                'stype':'502'
            },
            type:NOFYTYPE.NOFY_STATE_REPLY
        };
        if(msgblock.parameter.c.length > 240){
            msgblock.parameter.c=msgblock.parameter.c.substr(0,240);
        }
        return msgblock;
    }


    /**
     * 状态列表的类型（起初只放状态，后来只要一次提交能完成的都放进去了），不通类型的提交返回的内容会不同
     * @type {Object}
     */
    var NOFYTYPE={
        NOFY_STATE:0,
        NOFY_STATE_REPLY:1,
        NOFY_GOSSIP:2,
        NOFY_PUBLISHSTATUS:3,
        NOFY_DELGOSSIP:4,
        NOFY_DESCRIPT_PICTURE:5,
        NOFY_USER_REPLY:6,
        NOFY_OTHER:100
    };

    /**
     * 不停查询，有了就进行post
     * @return {Number}
     */
    var visitPostList=function(){
        if(lock || !postList || postList.length ==0){
            return setTimeout(visitPostList,dftWaitTime);
        }
        var postBlock=postList.shift();
        posttingBlock(postBlock);
        setTimeout(visitPostList,visitPostTime*1000);
    }

    /**
     * post消息
     * @param msgblock
     */
    var posttingBlock=function(msgblock){
        lock = true;
        Step(
            function(){
                var postData=querystring.stringify(msgblock.parameter);
                var url=msgblock.submit;
                var headers={
                    'Referer':'www.renren.com'
                    ,'Accept-Language': 'zh-cn'
                    ,'Content-Type':'application/x-www-form-urlencoded'
                    ,'Connection': 'Keep-Alive'
                    ,'Cache-Control': 'no-cache'
                };

                var retType=getRetTypeByPostType(msgblock.type);
                Request.post(url,LoginInfo.Cookie,postData,headers,msgblock,retType,this);
                console.log('【posting an reply!】');
                console.log(postData);
            },
            function(){
                var httpSucc=checkSimplePostHttpSucc(msgblock);
                if(!httpSucc){
                    onPostFail(msgblock);
                }
                lock=false;
            }
        );
    }

    /**
     * 增加重试次数加1，返回是否满最大尝试次数
     * @param obj
     * @param maxTryTime
     * @return {Boolean}
     */
    var addTryTimeAndWhetherFull=function(obj,maxTryTime){
        if(typeof obj != 'object'){
            return false;
        }
        if(typeof maxTryTime != 'number'){
            maxTryTime = 3;
        }
        if(!obj.tryTime){
            obj.tryTime = 1;
        }else{
            obj.tryTime ++;
        }
        if(obj.tryTime >= maxTryTime){
            return true;
        }
        return false;
    }

    var onPostFail=function(msgblock){
        if(!addTryTimeAndWhetherFull(msgblock)){
            //塞回队列继续尝试
            postList.unshift(msgblock);
        }else{
           //尝试3次后就放弃了
            console.log('Fail after try 3 Times.');
        }
    }

    /**
     * 根据提交的消息类型得到返回的是json还是html
     * @param postType
     * @return {String}
     */
    var getRetTypeByPostType=function(postType){
        var retType='txt';
        switch(postType){
            case NOFYTYPE.NOFY_PUBLISHSTATUS:
            case NOFYTYPE.NOFY_DELGOSSIP:
            case NOFYTYPE.NOFY_STATE_REPLY:
            case NOFYTYPE.NOFY_USER_REPLY:
                retType='json';
                break;
            default:
                retType='txt';
                break;
        }
        return retType;
    }

    /**
     * 检查一次post提交后的返回值是表示成功了还是失败了
     * @param msgblock
     * @return {Boolean}
     */
    var checkSimplePostHttpSucc=function(msgblock){
        var httpSucc = false;
        if(typeof(msgblock) == 'object'){
            if(msgblock.type == NOFYTYPE.NOFY_PUBLISHSTATUS){
                if(msgblock.parseStatus && (msgblock.Content.code == 0)){
                    httpSucc = true;
                }
            }else if(msgblock.type == NOFYTYPE.NOFY_DELGOSSIP){
                if(msgblock.parseStatus && msgblock.Content.status && (msgblock.Content.status.code == 1) ){
                    //http://page.renren.com/jomo/act/gossip/delete这个接口返回1是成功，他怎么不返回0，他是sb吗
                    httpSucc = true;
                }
            }else if(msgblock.type == NOFYTYPE.NOFY_DESCRIPT_PICTURE){
                if(msgblock.Location && (msgblock.Location.indexOf('http://photo.renren.com/photo/') >= 0)){
                    httpSucc = true;
                }
            }else if(msgblock.type == NOFYTYPE.NOFY_STATE_REPLY){
                if(msgblock.parseStatus && (msgblock.Content.code == 0)){
                    httpSucc = true;
                }
            }else if(msgblock.type == NOFYTYPE.NOFY_USER_REPLY){
                if(msgblock.parseStatus && (msgblock.Content.code == 0)){
                    httpSucc = true;
                }
            }
        }
        return httpSucc;
    }

    visitPostList();

}




exports.Hand=Hand;


