var renrenLogin=require('./login').INST;
var path=require('path');
var fs=require('fs');
var assert=require('assert');



var renrenINST=function(){
    var LoginTool;
    var LoginInfo;
    var Foots;
    var Hands;
    var callbackFn;
    var Filters;


    this.Login=function(account,callback){
        LoginTool=new renrenLogin();
        assert(typeof callback === 'function');
        LoginTool.setAccount(account);
        LoginTool.onekeyLogin(function(err,loginInfo){
            LoginInfo=loginInfo;
            callback(err,loginInfo);
        });
    };

    this.Start=function(hands,foots,filters,callback){
        assert(typeof hands === 'object');
        assert(typeof foots === 'object');
        assert(filters instanceof Array );
        assert(typeof callback === 'function');
        Foots=foots;
        Hands=hands;
        Filters=filters;
        callbackFn=callback;
        StartWork();
    };

    var StartWork=function(){
        for(var key in Hands){
            Hands[key].inst=new (Hands[key].exec)();
            Hands[key].inst.init(LoginInfo,Hands[key].params);
            Hands[key].inst.run(PutGeter);
        };
        for(var key in Foots){
            Foots[key].inst=new (Foots[key].exec)();
            Foots[key].inst.init(LoginInfo,Foots[key].params);
            Foots[key].inst.run(PutGeter);
        };
    }

    var PutGeter=function(handid,messageid,message){
        var MeggageBody={
            handid:handid,
            messageid:messageid,
            message:message
        }
        Filters.forEach(function(filter){
            MeggageBody=filter(MeggageBody);
        });
        for(var key in Foots){
            var foot=Foots[key].inst;
            foot.accept(MeggageBody.handid,MeggageBody.messageid,MeggageBody.message);
        }

    }


}

module.exports.INST=renrenINST;



