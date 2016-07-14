// onAvailable from https://github.com/furf/jquery-onavailable
(function(A){A.extend({onAvailable:function(C,F){if(typeof F!== "function"){throw new TypeError();}var E = A.onAvailable;if(!(C instanceof Array)){C = [C];}for(var B = 0,D = C.length;B<D;++B){E.listeners.push({id:C[B],callback:F,obj:arguments[2],override:arguments[3],checkContent:!!arguments[4]});}if(!E.interval){E.interval=window.setInterval(E.checkAvailable,E.POLL_INTERVAL);}return this;},onContentReady:function(C,E,D,B){A.onAvailable(C,E,D,B,true);}});A.extend(A.onAvailable,{POLL_RETRIES:2000,POLL_INTERVAL:20,interval:null,listeners:[],executeCallback:function(C,D){var B = C;if(D.override){if(D.override === true){B = D.obj;}else{B = D.override;}}D.callback.call(B,D.obj);},checkAvailable:function(){var F = A.onAvailable;var D = F.listeners;for(var B = 0;B<D.length;++B){var E = D[B];var C = $(E.id);if(C[0]&&(!E.checkContent||(E.checkContent&&(C.nextSibling||C.parentNode.nextSibling||A.isReady)))){F.executeCallback(C,E);D.splice(B,1);--B;}if(D.length === 0||--F.POLL_RETRIES === 0){F.interval = window.clearInterval(F.interval);}}}});})(jQuery);

(function(JQ){
	JQ.extend({
		uuid:function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
				function(c) {
					var r  =  Math.random() * 16 | 0,
						v  =  c === 'x' ? r : (r & 0x3 | 0x8);
					return v.toString(16);
				}).toUpperCase();
		}
	})
}
)(jQuery)

var API = function(cache, conf){
	this.init(cache, conf || {})
}

API.prototype = {
	D:false,

	init: function(cache, conf){
		this.D = conf.D || conf.debug
		this.cache = cache || {}
	},

	call: function(endpoint, post, cb){
		if (this.D) console.log("START API.call with", endpoint, post || " ")
		var that = this
		endpoint = this.fixURL(ac.replaceVars(endpoint))
		//if (D) console.log("endpoint is:", endpoint)
		var path = this.pathFromURL(endpoint)
		//if (D) console.log("path",  path)
		var conf = {
			url: endpoint,
			success: function(data){
				if (!path) {
					$.extend(that.cache, data, true)
				}else{
					set(that.cache, path.slice(1), data)
				}
				cb(null, data)
			},
			error: function(e){
				if (that.D) console.error("API call to "+endpoint+" was not successful!")
				return cb({
					"status":"error",
					"error":"BackendNotResponding",
					"message":"API call to "+endpoint+" was not successful!"
				})
			},
			dataType:"json"
		}
		if (post) {
			conf["type"] = "POST"
			conf["data"] = post
		}
		$.ajax(conf)
	},

	pathFromURL: function(URL){
		if (this.D) console.log("Creating path from URL:", URL)
		// slice "/api" and trailing "/" from URL
		var path = URL.slice(4, URL.length-1).replace(/\//g, ".")
		if (path === ".default") {
			path = ""
		}
		return path
	},

	fixURL: function(URL){
		if (URL.slice(-1) !== "/" && URL.indexOf("?") === -1) {
			URL = URL+"/"
		}
		if (URL[0] !== "/") {
			URL = "/"+URL
		}
		if (URL.slice(0, 4) !== "/api") {
			URL = "/api"+URL
		}
		return URL
	}
}

var Fragments = function(cache, conf){
	this.init(cache, conf || {})
}

Fragments.prototype = {
	D: false,

	init: function(cache, conf){
		this.D = conf.D || conf.debug || this.D
		this.cache = cache || {}
	},

	get: function(endpoint, cb){
		var that = this
		if (this.D) console.log("START Fragments.get with endpoint", endpoint)
		endpoint = this.fixURL(ac.replaceVars(endpoint))
		if (this.D) console.log("Fragment URL is:", endpoint)

		if (this.cache[endpoint]) {
			return cb(null, this.cache[endpoint])
		}
		$.ajax({
			url: endpoint,
			success: function(html){
				that.cache[endpoint] = html
				cb(null, html)
			},
			error:function(e){
				if (this.D) console.error("Fragment file at /fragments/"+fragmentURL+" not found!")
				cb({
					"status": "error",
					"message": "Fragment file at /fragments/"+fragmentURL+" not found!"
				})
			},
			dataType:"html"
		})
	},

	fixURL: function(URL){
		if (URL.slice(-5) !== ".html") {
			URL+= ".html"
		}
		if (URL[0] !== "/") {
			URL = "/"+URL
		}
		if (URL.slice(0, 10) !== "/fragments") {
			URL = "/fragments"+URL
		}
		return URL
	}
}

var AC = function(conf){
	this.init(conf || {})
}

AC.prototype = {
	D:false,
	trim: s => s.slice(0,100)+"...",
	"PREFIX": "ac",
	"components": {},
	"triggers": [],
	"defaultTemplates": {},
	RE_PATH_Mustashes: /{{.+?}}/g, // {{OPexpr}
	RE_PATH_Mustashes_split: /{{.+?}}/g,

	init: function(conf){
		this.appData = {}
		this.appDataOP = new ObjectPath(this.appData)
		this.D = conf.D || conf.debug
		this.fragments = new Fragments(null, {"D": this.D})
		this.API = new API(this.appData, {"D": this.D})
	},
	checkCondition: function(node){
		if (this.D) console.log("Checking condition for", node)
		var condition = this.rmMustashes($(node).attr(this.PREFIX+"-condition"))
		ret = !condition || this.appDataOP.execute(condition)
		if (this.D) console.log("condition for","'"+(condition || "no showWhen found")+"'", ret? "satisfied":"not satisfied", node, this.appDataOP.current)
		return ret
	},
	checkShowWhen: function(node){
		var condition = this.rmMustashes($(node).attr(this.PREFIX+"-showWhen"))
		ret = !condition || this.appDataOP.execute(condition)
		if (this.D) console.log("showWhen for","'"+(condition || "no showWhen found")+"'", ret? "satisfied":"not satisfied", node, this.appDataOP.current)
		return ret
	},
	getNodesWithShowWhen: function(node){
		if (!node.length) {
			if (this.D) console.info("nodes with ac-showWhen not found",  node)
			return $([])
		}
		var nodesWithSW = []
		node.each((n, el) => {
			if (el.nodeType === 3) {
				return
			}
			if ($(el).attr(this.PREFIX+"-showWhen")) {
				nodesWithSW.push(el)
			}
			nodesWithSW.push.apply(nodesWithSW, $("*["+this.PREFIX+"-showWhen]", el))
		})
		if (this.D) console.info("nodes with ac-showWhen",  nodesWithSW)
		return $(nodesWithSW)
	},
	rmMustashes: function(s){
		if (!s) {
			return s
		}
		if (s.slice(0, 2) === "{{") {
			return path.slice(2, -3)
		}
		return s
	},

	onAvailable: function(selector, fn){
		this.triggers.push({"selector": selector, "fn":fn})
		$.onAvailable(selector, fn)
	},

	trigger: function(){
		$.each(this.triggers, function(){
			$.onAvailable(this.selector, this.fn)
		})
	},

	replaceVars: function(s){
		if (this.D) console.log("START: replaceVars within string:", this.trim(s))
		s = s.replace(/<!--[\s\S]*?-->/g, "")
		var variables = s.match(this.RE_PATH_Mustashes)
		if (!variables) {
			return s.replace(/\/{/g, "{")
		}
		var splitted = s.split(this.RE_PATH_Mustashes_split),
				result = []
		//console.log(splitted)
		//console.log(variables)
		var that = this
		$.each(splitted,  function(n, e){
			//console.log(variables.length, variables[0])
			//  = "" is added by FF when {{}} occures inside a HTML tag
			var v = variables.length
				? that.appDataOP.execute(variables.shift().replace(/ = ""/g, '').slice(2, -2))
				: "".replace()
			//console.log(appData)
			//console.log(variables[0].replace(' = ""', ''),  v)
			if (v instanceof Object) {
				v = JSON.stringify(v, null, 2)
			}
			result.push(e, v)
		})
		if (this.D) console.log("END: replaceVars with string:", this.trim(result.join("")))
		return result.join("").replace(/\/{/g, "{")
	}
}

// TODO probably should be a JQuery plugin
var Spinner = function(el){
	this.init(el)
}

Spinner.prototype = {
	init: function(el){
		this.el = el
		el.spinner = this
		this.add()
	},
	add: function(){
		this.el.attr("title", "Waiting for response")
		this.el.find(".ac-spin").remove()
		this.el.append(" <i class='fa fa-spinner fa-spin ac-spin'></i>")
	},
	success: function(){
		this.el.removeAttr("title")
		var spinner = this.el.find(".fa-spin")
		spinner.removeClass("fa-spinner fa-spin")
					 .addClass("fa-smile-o")
					 .addClass("hide-delay")
		setTimeout(function(){spinner.remove()}, 1200)
		this.destroy()
	},
	error: function(err){
		this.el.attr("title", "Error! "+err)
		var spinner = this.el.find(".fa-spin")
		spinner.removeClass("fa-spinner fa-spin")
					 .addClass("fa-frown-o")
			//.addClass("hide-delay")
		//setTimeout(function(){spinner.remove()}, 1200)
		//this.destroy()
	},
	destroy: function(){
		delete this.el.spinner
		this.el = null
	}
}

var hashWorker = function(){
	this.params = []
	this.get()
	this.hashChangeSource = "window"
	this.currentHash = window.location.hash.substring(2)
}

hashWorker.prototype = {
	get: function(){
		var hashParams = []
		var e,
				a = /\+/g, // Regex for replacing addition symbol with a space
				r = /([^|;=]+)=?([^|;]*)/g,
				d = function (s) {
					return decodeURIComponent(s.replace(a,  " "))
				},
				q = window.location.hash.substring(2)

		this.currentHash = q

		while (e = r.exec(q)){
			var k = d(e[1]),
					v = d(e[2]),
					i = k.indexOf("_ds")
			if (i === -1) {
				var o = {"name": k}
				o[k] = v
				hashParams.push(o)
			} else{
				var x=this.find(k, hashParams)
				x[k] = v
			}
		}

		this.params = hashParams
		return hashParams
	},
	find: function(key, o){
		var i = key.indexOf("_ds")
		if (i > -1) {
			key = key.slice(0, i)
		}
		return (o || this.params).find(e => e.name === key)
	},
	makeHash: function(){
		var h = []
		$.each(this.params, function(n, o){
			$.each(o, function(k, v){
				if (k!="name" && k && v) {
					h.push(k+"="+v)
				}
			})
		})
		return "#!"+h.join("|")
	},

	remove: function(o){
		if (this.D) console.log("remove",o, this.params)
		delete o
		window.location.hash = this.makeHash()
	},
	clean: function(){
		if (this.D) console.log(this.params)
		this.params = Array.filter(this.params, function(e){
			if (this.D) console.log(e, $("#"+e.name), $("#"+e.name).length)
			return $("#"+e.name).length ? true : false
		})
	},
	update: function(o){
		if (this.D) console.log("update", o)
		var self = this
		$.each(o, function(k, v){
			var x = self.find(k)
			if (x) {
				x[k] = v
			} else {
				var o = {"name": k}
				o[k] = v
				self.params.push(o)
			}
		})
		this.clean()
		if (this.D) console.log(this.params)
		window.location.hash = this.makeHash()
	}
}

var set = function(o, path, val) {
	var splitted = path.split('.')
	for (var i = 0;i<splitted.length-1;i++) {
		var x = splitted[i];
		o[x] = o[x]||{}
		o = o[x]
	}
	o[splitted.pop()] = val
}
