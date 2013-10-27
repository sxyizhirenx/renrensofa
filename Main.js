var fs=require('fs');
var Step=require('step');
var renrenUtil=require('./lib/renrenUtil').INST;
var stateHand=require('./lib/stateHand').Hand;

var renrenFile='renren.json';
var renrenAccount=JSON.parse(fs.readFileSync(renrenFile,'utf8'));
var renren=new renrenUtil();
var state=new stateHand();




function serialAction(){
    Step(
        function(){
            //Login RenRen
            renren.Login(renrenAccount,this);
        },
        function(err,loginInfo){
            //renren login callback
            if(loginInfo.logined){
                renrenAccount.Cookie=loginInfo.Cookie;
                renrenAccount.token=loginInfo.token;
                renrenAccount.homeUrl=loginInfo.homeUrl;
                renrenAccount.uid=loginInfo.uid;
                saveAccount(renrenFile,renrenAccount);
                console.log('renren Login Succ!');
                this();
            }else{
                console.log('renren Login Fail!');
            }
        },
        function(){
            state.init(renrenAccount,renrenAccount.pageID,renrenAccount.replyMsg,renrenAccount.index);
            state.run(function(err,info){
                if(err){
                    process.exit(0);
                }else{
                    if(info.type === 'index'){
                        //更新index
                        renrenAccount.index=info.value;
                        saveAccount(renrenFile,renrenAccount);
                    }
                }
            });
        }
    );
}


function saveAccount(file,logininfo){
    fs.writeFileSync(file,JSON.stringify(logininfo,null,4), 'utf8');
}

serialAction();