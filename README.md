sofaer
==========

#人人网抢沙发


##1.配置renren.json，

###用记事本或其他编辑器打开renren.json(如果记事本打开后文字格式很乱没有自动换行，请换成写字板或nodepad++等别的编辑软件打开)。

   1.email和passwd后面分别配上你要登录人人网的用户名（邮箱/手机号）和密码，

   2.pageid中配置好你要抢沙发的主页的id，不同id之间通过逗号分割.这个id可以通过对方主页的网址中取得。

   比如http://page.renren.com/601829270，这个主页的id就是601829270.

   3.isPage是配置你登录的这个账户是个人还是公共主页。如果是个人保持"false".公共主页就改成"true".

   4.index是用于计数的，保持1就可以了，后面每抢一次就会加一.


    "email": "uusername",	用户名
	
    "passwd": "upassword",  密码
	
    "pageID": [
	
        600005227           要抢沙发主页的id

        ,123456789           要抢沙发主页的id
		
    ],
	
    "replyMsg": [
	
        "(zy)"				回复内容
		
    ],
	
    "isPage": "false",		保持false即可
	
    "index": 1              用于计数

##2.安装node。

    下载并安装node => http://nodejs.org/dist/v0.10.21/node-v0.10.21-x86.msi


##3.执行“可输入验证码版.cmd”

   一般情况下就可以登录成功了，会看到如下信息（）：

   homepage location:http://www.renren.com/xxxxxxxxxx

   token:requestToken[xxxxxxxx],_rtk[xxxxxxx]

   renren Login Succ!

   相反如果提示输入验证码，就打开与“可输入验证码版.cmd”同一目录下的icode.png,

   查看验证码字符并输入后回车。就可以登录成功了。

   成功登录后，关闭“可输入验证码版.cmd”窗口.
  
##3.执行“自动重启版.cmd”

   由于时间久了cookie会失效，程序将自动退出。这个就是实现cookie失效后自动重启。

我假设你是已经知道必须关注对方主页才能给对方回复消息才能抢沙发的！



