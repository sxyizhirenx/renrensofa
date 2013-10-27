var fs=require('fs');
var http=require('http');
var path=require('path');
var querystring=require('querystring');
var RSATool=require('simple-rsa');
var Request=require('node-request');
var Step=require('step');
var toughCookie=require('tough-cookie');
var CookieJar=toughCookie.CookieJar;
var CookiePair=toughCookie.Cookie;
var assert=require('assert');


var Login=function(){
    var accountInfo;    //账户信息
    var encryptkey;     //rsa加密参数
    var captcha;        //是否需要验证码
    var icode;          //验证码
    var uname;          //账户信息
    var homepage;       //主页的html
    var token;          //页面的token
    var loginInfo;      //登陆信息
    var otherAccounts;  //其他用户身份信息【switchAccount】
    var pageState;      //页面状态【switchAccount】
    var newAccount;     //切换到另一用户身份【switchAccount】
    var callbackFn;     //登录后的回调函数

    /**
     * 把json形式的对象转成用toughCookie.Cookie表示的对象
     * @param storeIdx
     */
    var makeJsonToCookieObject=function(storeIdx){
        if(typeof storeIdx !== 'object'){
            storeIdx = {};
        }
        Object.keys(storeIdx).forEach(function(domain){
            var domainGroup=storeIdx[domain];
            Object.keys(domainGroup).forEach(function(path){
                var pathGroup=domainGroup[path];
                Object.keys(pathGroup).forEach(function(key){
                    var obj=pathGroup[key];
                    obj.expires=toughCookie.parseDate(obj.expires);
                    obj.creation=toughCookie.parseDate(obj.creation);
                    obj.lastAccessed=toughCookie.parseDate(obj.lastAccessed);
                    pathGroup[key]=new CookiePair(obj);
                });
            });
        });
    }

    /**
     * 设置登录的账户
     * @param account
     */
    this.setAccount=function(account){
        accountInfo={};
        accountInfo.email=account.email || '';
        accountInfo.passwd=account.passwd || '';
        accountInfo.Cookie=new CookieJar();
        //要么account.Cookie为空，要么是完整的store.idx
        assert(!(account.Cookie) || (account.Cookie.store && account.Cookie.store.idx));
        if(account.Cookie){
            makeJsonToCookieObject(account.Cookie.store.idx);
            accountInfo.Cookie.store.idx=account.Cookie.store.idx;
        }
        //
        accountInfo.isPage=('true'==account.isPage)?'true':'false';
    }

    /**
     * 尝试cookie是否有效
     */
    var testCookie=function(){
        //console.log('stepCookieLogin');
        uname={};
        Step(
            function(){
                var url='http://notify.renren.com/wpi/getonlinecount.do';
                Request.get(url,accountInfo.Cookie,null,uname,'txt',this);
            },
            function(){
                var loginOk=false;
                try{
                    var tmpJson=JSON.parse(uname.Content.trim());
                    if(tmpJson.hostid>0){
                        console.log('Cookie LOGIN OK!');
                        loginOk=true;
                    }else{
                        console.log('Cookie LOGIN FAIL!');
                    }

                }catch(e){
                    console.log(uname.Content);
                    console.log('Cookie LOGIN FAIL!');
                }
                if(loginOk){
                    loginInfo.Content={
                        code:true,
                        homeUrl:'http://www.renren.com/home'
                    };
                    console.log(tmpJson);
                    //浏览主页解析token，等后续操作
                    browserHomepage();
                }else{
                    //cookie无效，重新登录
                    ajaxLogin();
                }

            }
        );

    };



    /**
     * 设置RSA加密的参数
     */
    var getEncryptKey=function(){
        //console.log('stepEncryptKey');
        encryptkey={};
        var url='http://login.renren.com/ajax/getEncryptKey';
        Request.get(url,null,null,encryptkey,'json',this);

    }

    /**
     * 检测该账号是否需要验证码
     */
    var getCaptcha=function(){
        //console.log('stepCaptcha');
        captcha={};
        var postData=querystring.stringify({
            'email': accountInfo.email
        });
        var url='http://www.renren.com/ajax/ShowCaptcha';
        var headers={
            'Referer':'www.renren.com'
            ,'Accept-Language': 'zh-cn'
            ,'Content-Type':'application/x-www-form-urlencoded'
            ,'Host': 'www.renren.com'
            ,'Content-Length':postData.length
            ,'Connection': 'Keep-Alive'
            ,'Cache-Control': 'no-cache'
        };
        Request.post(url,null,postData,headers,captcha,'txt',this);
    }

    /**
     * 获取用户输入验证码
     * @param getter
     * @param callbackfn
     */
    function getInputIcode(getter,callbackfn){
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', function (chunk) {
            process.stdout.write('data: ' + chunk);
            var codeLen=4;
            getter.str=chunk.substr(0,codeLen);
            process.stdin.pause();
            callbackfn();
        });

        process.stdin.on('end', function () {
            process.stdout.write('end');
            process.stdin.pause();
        });
    }

    /**
     * 取验证吗图片，以及读取用户输入的验证码
     */
    var getICode=function(){
        //console.log('stepICode');
        processStep='stepICode';
        icode={str:''};
        var __this=this;
        //console.log(captcha);
        if(1==captcha.Content || 4==captcha.Content){
            Step(
                function(){
                    var url='http://icode.renren.com/getcode.do?t=web_login&rnd='+Math.random();
                    Request.get(url,accountInfo.Cookie,null,icode,'buf',this);
                },
                function(){
                    fs.writeFile('icode.png', icode.Content, 'binary',this);
                },
                function(){
                    console.log('输入验证码，请看当前目录下的icode.png');
                    getInputIcode(icode,__this);
                }
            );
        }else{
            __this();
        }

    }

    /**
     * 前期工作准备好后，提交登录信息
     */
    var login=function(){
        //console.log('stepLogin');
        assert(accountInfo);
        var pass=accountInfo.passwd;
        if(encryptkey.Content && encryptkey.Content.isEncrypt){
            RSATool.setMaxDigits(encryptkey.Content.maxdigits*2);
            var key=new RSATool.RSAKeyPair(encryptkey.Content.e,"null",encryptkey.Content.n);
            pass=RSATool.encryptedString(key, encodeURIComponent(pass));//encodeURIComponent可以转化中文成基本字符
        }
        //console.log(pass);
        var postData=querystring.stringify({
            'email': accountInfo.email,
            'origURL': 'http://www.renren.com/home',
            'icode': icode.str,
            'domain': 'renren.com',
            'key_id': 1,
            'captcha_type': 'web_login',
            'password': pass,
            'rkey': encryptkey.Content.rkey
        });
        //console.log(postData);
        var url = 'http://www.renren.com/ajaxLogin/login?1=1&uniqueTimestamp='+Math.random();
        var headers={
            'Referer':'www.renren.com'
            ,'Accept-Language': 'zh-cn'
            ,'Content-Type':'application/x-www-form-urlencoded'
            ,'Connection': 'Keep-Alive'
            ,'Cache-Control': 'no-cache'
        };

        Request.post(url,accountInfo.Cookie,postData,headers,loginInfo,'json',this);
    }

    /**
     * 密码步骤步骤
     */
    var ajaxLogin=function(){
        Step(
            getEncryptKey,
            getCaptcha,
            getICode,
            login,
            browserHomepage
        );
    }

    /**
     * Cookie登录步骤
     */
    var cookieLogin=function(){
        testCookie();
    }
    /**
     * 留言home页面，便于提取token
     * 这一步很关键，承前启后
     */
    var browserHomepage=function(){
        homepage={};
        //console.log('stepHomepage');
        var url=loginInfo.Content.homeUrl;
        accountInfo.logined=loginInfo.Content.code;//用于外部判断是否登录成功
		console.log(loginInfo);
        assert(true === accountInfo.logined,'Username And Password Not Match');
        homepage.url=url;
        Request.get(url,accountInfo.Cookie,null,homepage,'txt',processRealHomepage);
    }

    /**
     * home页面可能多次jump，这里处理jump
     */
    var processRealHomepage=function(){
        if(301 == homepage.Status || 302 == homepage.Status){
            var url=homepage.Location;
            console.log('homepage location:'+url);
            homepage.url=url;
            Request.get(url,accountInfo.Cookie,null,homepage,'txt',processRealHomepage);/*可能还要跳转*/
        }else{
            switchUser();
        }
    }

    /**
     * 切换用户步骤
     */
    var switchUser=function(){
        Step(
            getUname,
            parseToken,
            getOtherAccount,
            getOtherPageState,
            switchNewAccount,
            checkNewAccount
        );
    }

    /**
     * 获取id和name，公共主页的name和id一样，获取不到
     */
    var getUname=function(){
        //console.log('stepUname');
        assert(accountInfo);
        var url='http://notify.renren.com/wpi/getonlinecount.do';
        Request.get(url,accountInfo.Cookie,null,uname,'json',this);
    }

    /**
     * 从home的html中解析出token
     */
    var parseToken=function(){
        //console.log('stepToken');
        token={};
        html=homepage.Content;
        var tokenREG=/\{get_check:'(.+)',get_check_x:'(.+)',env:\{/;
        var ret;
        if(ret=tokenREG.exec(html)){
            token.requestToken=ret[1];
            token._rtk=ret[2];
            console.log('token:requestToken['+token.requestToken+'],_rtk['+token._rtk+']');
        }else{
            console.log('get token error!');
            token.requestToken='';
            token._rtk='';
            //失败会一直发不出状态
            //标记登录失败,外层做重启等操作
            //accountInfo.logined = false;
        }
        assert(''!=token.requestToken && ''!=token._rtk);
        this();
    }


    /**
     * 读取别的账号，用户切换普通账号和公共主页
     */
    var getOtherAccount=function(){
        //console.log('stepOtherAccounts');
        otherAccounts={};
        var url='http://www.renren.com/getOtherAccounts';
        Request.get(url,accountInfo.Cookie,null,otherAccounts,'json',this);
    }

    /**
     * 读取账户的状态信息，切换账号时要检测它的值
     */
    var getOtherPageState=function(){
        //console.log('stepPageState');
        pageState={};
        var needSwitch = (otherAccounts.Content && (accountInfo.isPage != otherAccounts.Content.self_isPage)
            && otherAccounts.Content.otherAccounts && otherAccounts.Content.otherAccounts[0])?true:false;
        pageState.needSwitch=needSwitch;
        if(needSwitch){
            console.log('Need to switch account!');
            var pids=otherAccounts.Content.otherAccounts[0].transId;
            var url='http://page.renren.com/api/pageState';

            var postData=querystring.stringify({
                '_rtk': token._rtk,
                'pids':pids,
                'requestToken':token.requestToken
            });
            var headers={
                'Referer':'www.renren.com'
                ,'Accept-Language': 'zh-cn'
                ,'Content-Type':'application/x-www-form-urlencoded'
                ,'Connection': 'Keep-Alive'
                ,'Cache-Control': 'no-cache'
            };

            Request.post(url,accountInfo.Cookie,postData,headers,pageState,'json',this);
        }else{
            //console.log('Need NOT to switch account!');
            this();
        }
    }

    /**
     * (确认要切换后)执行切换普通用户和主页的身份
     */
    var switchNewAccount=function(){
        //console.log('stepNewAccount');
        newAccount={};

        if(pageState.needSwitch && pageState.Content && (pageState.Content.code == 0)){
            var destId=otherAccounts.Content.otherAccounts[0].id;
            var url='http://www.renren.com/switchAccount';

            var postData=querystring.stringify({
                '_rtk': token._rtk,
                'destId': destId ,
                'origUrl':homepage.url,
                'requestToken':token.requestToken
            });
            var headers={
                'Referer':'www.renren.com'
                ,'Accept-Language': 'zh-cn'
                ,'Content-Type':'application/x-www-form-urlencoded'
                ,'Connection': 'Keep-Alive'
                ,'Cache-Control': 'no-cache'
            };
            Request.post(url,accountInfo.Cookie,postData,headers,newAccount,'json',this);
        }else{
            this();
        }
    }

    /**
     * 检测是否切换成功，成功后重新读取home页面
     */
    var checkNewAccount=function(){
        //console.log('stepCheckNewAccount');
        if(newAccount.Content && newAccount.Content.isJump){
            loginInfo.Content.homeUrl=newAccount.Content.url;
            //用户切换后重新解析token
            browserHomepage();
        }else{
            assert(typeof callbackFn === 'function');
            accountInfo.token=token;
            accountInfo.homeUrl=homepage.url;
            accountInfo.uid=getUid(accountInfo);
            callbackFn(null,accountInfo);
        }

    }

    /**
     * 获取用户id，在uname中的不是有用的id，
     * 这里先从home链接中提取，失败再从cookie中提取
     * @return {*}
     */
    var getUid=function(accountInfo){
        var uidReg;
        var ret;
        uidReg=/www\.renren\.com\/([\d]+)/;
        ret=uidReg.exec(accountInfo.homeUrl);
        if(ret){
            return ret[1];
        }else{
            uidReg=/feedType=([\d]+)_hot/;
            ret=uidReg.exec(accountInfo.Cookie.store.idx['www.renren.com']['/']['feedType'].cookieString());
            if(ret){
                return ret[1];
            }
        }
        return '';
    }

    this.onekeyLogin=function(callback){
        assert(typeof callback === 'function');
        callbackFn=callback;
        loginInfo={};   //初始化
        cookieLogin();
    }

}

module.exports.INST=Login;


