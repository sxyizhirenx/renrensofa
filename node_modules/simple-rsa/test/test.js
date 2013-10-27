var RSATool=require('../lib/simple-rsa');

function encry(encParam){
    RSATool.setMaxDigits(encParam.maxdigits*2);
    var key=new RSATool.RSAKeyPair(encParam.e,"null",encParam.n);
    return RSATool.encryptedString(key, encodeURIComponent(encParam.text));
}

var param = {
    "e" : "10001",
    "n" : "856381005a1659cb02d13f3837ae6bb0fab86012effb3a41c8b84badce287759",
    "maxdigits" : "19",
    "text":"something"
}

//"12345678"=>"81b792412e3f0751d5e756ad5313d7680aa9057f4de2211528adb8abaa88e05c"
param.text="12345678";
console.log("81b792412e3f0751d5e756ad5313d7680aa9057f4de2211528adb8abaa88e05c"===encry(param));
//"usb"=>"0a218c68d84f9d578ce182f20a513ed07c18334f1517b2491a3556a28e587fc2"
param.text="usb";
console.log("0a218c68d84f9d578ce182f20a513ed07c18334f1517b2491a3556a28e587fc2"===encry(param));