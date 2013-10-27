/**
 * Created with JetBrains WebStorm.
 * User: Administrator
 * Date: 13-5-6
 * Time: 上午12:08
 * To change this template use File | Settings | File Templates.
 */

var Request=require('node-request');


var GossipSource=function(){

    var maxMsgLen;

    var pageId;

    var cookie;

    var gossipHtml;

    var callbackfn;

    var msgList;

    this.getStateList=function(pageid,cookieStr,maxLen,callback){
        maxMsgLen = maxLen;
        pageId=pageid;
        cookie=cookieStr;   //实际上是一个cookie对象

        if(typeof callback == 'function'){
            callbackfn = callback;
        }

        if(pageId && cookie){
            gossipHtml={};
            //console.log('get state['+pageId+']');
            var url='http://status.renren.com/GetSomeomeDoingList.do?userId='+pageId +'&curpage=0';
            Request.get(url,cookie,null,gossipHtml,'json',washStateHtml);
        }
    }

    var washStateHtml=function(){
        msgList=[];
        if(gossipHtml.Content && gossipHtml.parseStatus){
			//console.log(gossipHtml.Content);
            var doingList=gossipHtml.Content.doingArray;
			if(!doingList){
				//被拉黑了
				doingList=[];
			}
            for(var i=0;i<doingList.length ;i++){
                var doing=doingList[i];
                var msg={
                    id:doing.id,
                    content:doing.content,
                    owner:doing.userId
                };

                msgList.push(msg);
                if(msgList.length >= maxMsgLen){
                    break;
                }
            }

        }
        if(msgList.length <= 0){
            //便于查看是不是需要验证码什么的
            console.log(pageId);
            console.log(gossipHtml);
        }
        if(typeof callbackfn == 'function'){
            callbackfn(pageId,msgList);
        }
    }

}

exports.INST=GossipSource;

