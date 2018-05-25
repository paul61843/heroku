var Koa = require('koa')
var Router = require('koa-router')
var logger = require('koa-logger')
var bodyParser = require('koa-bodyparser')
var koaStatic = require('koa-static')
var session = require('koa-session')
var render = require('./lib/render')
const fs = require('mz/fs')
const asyncBusboy = require('async-busboy')
var app = new Koa()
var router = new Router()
//最新公告文章內容會被吃掉的問題 原因在於相同posts導致
var dbtitle, dbstore
var post =[]
var posts = []
var posts2 = []
var newposts = []
var db, dbo
var user = false
var mongodb = require('mongodb').MongoClient
const url = 'mongodb://admin:admin@ds119080.mlab.com:19080/helio-blog'
// nodemon server.js 自動偵測更動
const PORT = process.env.PORT || 5000

app.use(koaStatic(__dirname))
app.use(bodyParser())
app.use(logger())
app.keys = ["@#$TYHaadfa1"]
app.use(session(app))

router
.get('/', index)
.get('/post/new', add)
.get('/post/:id', show)
.get('/article/:page', article)
.get('/article/', article)
.get('/sell', sell)
.get('/fan', fan)
.get('/find', FindDatabase)
.get('/login1', login1)
//.post('/post', create) 暫時沒用
.post('/post/sell', InputSell)
.post('/upload', fileupload)
.post('/login', login)
.get('/logout', logout) //logout 要用post還是get

async function index (ctx) {
  var databasepath = "title"
  await FindDatabase(databasepath, 1)
  user = isPass(ctx)
  ctx.body = await render('index', { posts: posts, newposts: newposts, user: user})
}

async function add (ctx) {
  if (!isPass(ctx)) {
    ctx.redirect('/login1')
    return
  }
  ctx.body = await render('new', { newposts: newposts, user: user})
}

async function show (ctx) {
  for(var i=0; i<8; i++){
      if((posts[i]._id).toString() === ctx.params.id) 
          var post = posts[i]
  }
  //var post = posts[ctx.params.id]
  if (!post) ctx.throw(404, 'invalid post id')
  ctx.body = await render('show', { posts: posts, newposts: newposts, user: user})
}

async function article (ctx) {
  var databasepath = "title"
  await FindDatabase(databasepath, ctx.params.page)
  ctx.body = await render('article', { posts: posts, newposts: newposts, user: user})
}

async function sell (ctx) { 
  var databasepath = "store"
  await FindDatabase(databasepath, 0)
  ctx.body = await render('sell', { posts: posts, newposts: newposts, user: user})
}

async function fan (ctx) {
  ctx.body = await render('fan', { posts: posts, newposts: newposts, user: user})
}

async function create (fields, path) {
  
  var post = fields
  var id = posts.push(post) - 1
  var databasepath = "title"
  post.created_at = new Date()
  //post.id = id //資料最後一筆ID相同的問題
  post.path = path
  await InputDatabase(post , databasepath)
}

async function InputSell (ctx) {
  var post = ctx.request.body
  var databasepath = "store"
  await InputDatabase(post, databasepath)
  ctx.redirect('/sell')
}

async function InputDatabase (mydata, databasepath) {
  await dbo.collection(databasepath).insert(mydata)
  console.log(databasepath +" inserted")
}

async function FindDatabase(databasepath, page){
  var postsr = await dbo.collection(databasepath).find({}).toArray()
  if (databasepath ==='title'){
      var fipage = (page-1)*8
      posts = postsr.reverse().splice(fipage, 8*page)
      newposts = posts
  }
  else if(databasepath ==='store'){
      posts = postsr
  }
  console.log("1 document find")
}
async function fileupload(ctx, next) {
  const {files, fields} = await asyncBusboy(ctx.req)
  //console.log('files=%s', JSON.stringify(files, null, 2))
  console.log('fields=%j', fields)
  for (var i in files) {
    var file = files[i].filename //文件名稱
    var filetype = file.slice((file.lastIndexOf(".") - 1 >>> 0) + 2)//取得副檔案
    //console.log(filetype)
    //console.log('file=%s', file)
    //var post = { path: 'upload/' + file }
    var stream = fs.createWriteStream('upload/' + file)
    files[i].pipe(stream)
    create(fields, file)
    //var databasepath = "imagepath"
    //InputDatabase (post, databasepath)
  }
  ctx.redirect('/')
  //ctx.body = JSON.stringify(files, null, 2)
}

//登入系統尚未完成
async function login1(ctx){
  user = isPass(ctx)
  ctx.body = await render('login', { posts: posts, newposts: newposts, user: user})
}

function isPass(ctx) {
  return typeof(ctx.session.user)!=='undefined'
}

function login(ctx) {
  var req = ctx.request//, res = ctx.response
  var p = ctx.request.body
  // if (req.protocol !== 'https') {
  //   response(res, 401, p.user+":login fail!")
  //   return
  // }  
  if (p.user === "admin" && p.password === "admin") { //密碼部分設定
    ctx.session.user = p.user
    ctx.redirect('/')
  } else {
    ctx.redirect('/login1')
  }
 }

 function logout(ctx) {
  //var req = ctx.request, res = ctx.response
  ctx.session = null
  ctx.redirect('/login1')
  //response(res, 200, "logout success!")
 }

async function main () {
  db = await mongodb.connect(url)
  dbo = db.db("helio-blog")
  app.use(router.routes()).listen(PORT)
}
main ()