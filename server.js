//server.js 

// packages 
var express = require('express');
var app = express();
var server = require('http').Server(app);
var bodyParser = require('body-parser'); 
var needle = require('needle'); 
var path = require('path');

// globals 
var subscribedTags = []; 
var maxsubscriptionlife = 60000; 
var client_id = '617bb2656c9d46ccbc3a603106230bf0'; 
var client_secret = '8e76d033812d47aa95b8e65b3b5c01c1'; 
var redirect = 'https://mike-s-imagestreamer.herokuapp.com'; 
var environment = 'production';
var io = require('socket.io').listen(app.listen(5000));

if(environment == 'dev'){
    redirect = 'http://146.200.38.90:5000'; 
}


//config 
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());  

app.use("", express.static(path.join(__dirname, 'public')));


var port = process.env.PORT || 5000;

// API ROUTES 
var router = express.Router(); 

router.use(function(req, res, next){
	console.log('api is being called!');
	// let routing propagate
	next(); 
}); 

// all api requests will be routed through here
router.get('/api', function  (request, response) {
	response.json({message: 'api reached'}); 
}); 

// TAG ROUTES 
router.route('/api/tag')
	.post(function(request, response){
		// obtain tagname and see if we already have it, if we do, update its expiration date, otherwise, call subscription APIs 
		var hashtag = request.body.hashtag; 
		var isSubscribed = subscribedTags.filter(function(value){
			return value.hashtag == hashtag; 
		}).length > 0; 

		if(isSubscribed){
			//no need to add, just update the max life
			 for(currentsub in subscribedTags){
			 	if(subscribedTags[currentsub].hashtag == 'hashtag'){
			 		subscribedTags[currentsub].maxlife = new Date(new Date().getTime() + maxsubscriptionlife); 
			 	}
			 }

		}
		else{
			//call instagram API for real time subscription 
			var post_data = {
				"hashtag" : hashtag
			}
			var options = []; 

			needle.post(redirect + '/api/subscription', post_data, options, function(err, resp){
				var a = 'a'; 

			}); 

		}

		response.json({message: "hashtag added successfully!"}); 

	})
	.get(function(request, response){
		response.json(subscribedTags); 
	});

router.route('/api/tag/:hashtag')
	.get(function(request, response){
		for(currentsub in subscribedTags){
			if(subscribedTags[currentsub].hashtag == request.params.hashtag){
				response.json(subscribedTags[currentsub]); 
			}
		}
		response.json({message: 'no tag subscribed by that name.'}); 

	})
	.delete(function(request, response){
		for(currentsub in subscribedTags){
			if(subscribedTags[currentsub].hashtag == request.params.hashtag){
				//response.json(subscribedTags.splice(currentsub, 1)); 
				removeSubscription(subscribedTags[currentsub].subscription_id)
			}
		}
	    response.json({message: 'no tag subscribed by that name.'}); 

	}); 


router.route('/api/image/:hashtag')
	.get(function(request, response){
		var url = 'https://api.instagram.com/v1/tags/' + request.params.hashtag + '/media/recent' + '?access_token=' +  request.query.access_token; 
		
	}); 


// INSTAGRAM SUBSCRIPTION ROUTES 

// subscriptions (node to real time API communication)
router.route('/api/subscription/register')
.get(function(request, response) {

   if(typeof request.query["hub.challenge"] !== "string"){ // ignore as this isn't from instagram API
      response.send(""); 	
    }
	else{ //if the call is successful, echo back challenge
      response.send(request.query["hub.challenge"]); 	
	}
  
})

.post(function(request, response) {

   if(typeof request.query["hub.challenge"] !== "string"){ 
      response.send(""); 	
    }
	else{ //if the call is successful, echo back challenge
      response.send( request.query["hub.challenge"]); 	
    }
  
});



router.route('/api/subscription/new')
	.post(function(request, response) {

	
			 //console.log('incoming subscription update for tag: ' + request.body[i].object_id);
			 io.emit('new recent image', request.body); 
	

	   response.send(''); 
  
}).get(function(request, response) {

   if(typeof request.query["hub.challenge"] !== "string"){ // ignore as this isn't from instagram API
      response.send(""); 	
    }
	else{ //if the call is successful, echo back challenge
      response.send(request.query["hub.challenge"]); 	
	}
  
})


router.route('/api/subscription')
	.post(function(request, response) {

	   if(typeof request.body.hashtag === "string"){ 
	     
	     var tag = request.body.hashtag;
	     var options = []; 
	 	 var post_data = {
	 	 	"object": "tag", 
	 	 	"object_id": tag,
	 	 	"aspect": "media", 
	 	 	"callback_url": redirect + '/api/subscription/new'
	 	 }; 

	 	 needle.post('https://api.instagram.com/v1/subscriptions?client_id=' + client_id + '&client_secret=' + client_secret + '&verify_token=' + 'streamapp', post_data, options, function(err,response){
	 	 	  if(response.statusCode == 200 ){
		 	    	console.log("request succeeded"); 
		 	    	//subscribedTags
		 	    	subscribedTags.push({
		 	    		hashtag: response.body.data.object_id, 
		 	    		maxlife: new Date(new Date().getTime()+60000), 
		 	    		subscription_id:response.body.data.id

		 	    	}); 

		 	  }
		 	  else{
		 	    	//response.send('subscription failed\n Status Code: ' + resp.statusCode + '\n response message: ' /*+ resp.body.meta.error_message*/); 
		 	    	console.log("request failed"); 
		 	  }
	 	 }); 
	   }

	   response.send('');
  
}).get(function(request, response) {

   if(typeof request.query["hub.challenge"] !== "string"){ // ignore as this isn't from instagram API
      response.send(""); 	
    }
	else{ //if the call is successful, echo back challenge
      response.send(request.query["hub.challenge"]); 	
	}
  
})


router.route('/api/subscription/:id')
	.delete(function(request, response) {
	if(typeof request.params.id === "string"){ // ignore as this isn't from instagram API
     
 	 	  // remove subscriptions by subscription id 
	     var id = request.params.id; 
	     var options = []; 
	 	 var post_data = {
	 	 }; 

	 	needle.delete('https://api.instagram.com/v1/subscriptions?&client_id=' + client_id + '&id=' + id + '&client_secret=' + client_secret, post_data, options,  
	 	(function(scope){

	 		for(currentsub in subscribedTags){
				if(subscribedTags[currentsub].subscription_id == scope){
					subscribedTags.splice(currentsub, 1); 
					console.log('hashtag deleted');
					return; 
				}
			}
			console.log('no record of tag to delete');

     }(request.params.id))); 

   }

   response.send('');

}); 

router.route('/api/user/authorize')
.get(function(request, response){

	var authEndpoint = ''; 
	var redirect_uri =  redirect + '/api/user/authorize/redirect'; 

	authEndpoint = 'https://api.instagram.com/oauth/authorize/?client_id='
	+ client_id 
	+ '&redirect_uri=' 
	+  redirect_uri
	+ '&response_type=code'; 

	response.redirect(authEndpoint); 

}); 

router.route('/api/user/authorize/redirect')
.get(function(request, response){

	var authEndpoint = ''; 
    var code = request.query['code']; 
   
    var redirect_uri = redirect + '/api/user/authorize/redirect'; 

    var post_data = {
    	"client_id": client_id, 
    	"client_secret": client_secret,
    	"grant_type": "authorization_code",  
    	"code": code, 
    	'redirect_uri': redirect_uri
    }; 

    var options = []; 

    needle.post('https://api.instagram.com/oauth/access_token', post_data,  options, function(err, resp) {
      console.log("we should have the token now"); 
      var access_token = resp.body.access_token; 
      response.cookie('access_token', access_token); 
      response.redirect('/?access_token='+ access_token)
	});

}); 





function removeSubscription(subscription_id)
{
	  // remove subscriptions by subscription id 
	     var id = subscription_id; 
	     var options = []; 
	 	 var post_data = {
	 	 }; 

	 	needle.delete('https://api.instagram.com/v1/subscriptions?&client_id=' + client_id + '&id=' + id + '&client_secret=' + client_secret, post_data, options,  
	 	(function(scope){

	 		for(currentsub in subscribedTags){
				if(subscribedTags[currentsub].subscription_id == scope){
					subscribedTags.splice(currentsub, 1); 
					console.log('hashtag deleted');
					return; 
				}
			}
			console.log('no record of tag to delete');

     }(subscription_id))); 

}

// register routes 
app.use('/', router); 

// start server 
io.sockets.on('connection', function (socket) {
    console.log('client connect');
    socket.on('echo', function (data) {
    io.sockets.emit('message', data);
 });

    socket.on('disconnect', function(){
    console.log('user disconnected');
  });

});


console.log('server started on port: ' + port); 

