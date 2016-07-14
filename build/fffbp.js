// LICENSE: MIT, copyright Adrian Kalbarczyk 2010-1016
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
		var that = this
		endpoint = this.fixURL(ac.replaceVars(endpoint))
		var path = this.pathFromURL(endpoint)
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
		endpoint = this.fixURL(ac.replaceVars(endpoint))

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
		var condition = this.rmMustashes($(node).attr(this.PREFIX+"-condition"))
		ret = !condition || this.appDataOP.execute(condition)
		return ret
	},
	checkShowWhen: function(node){
		var condition = this.rmMustashes($(node).attr(this.PREFIX+"-showWhen"))
		ret = !condition || this.appDataOP.execute(condition)
		return ret
	},
	getNodesWithShowWhen: function(node){
		if (!node.length) {
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
		s = s.replace(/<!--[\s\S]*?-->/g, "")
		var variables = s.match(this.RE_PATH_Mustashes)
		if (!variables) {
			return s.replace(/\/{/g, "{")
		}
		var splitted = s.split(this.RE_PATH_Mustashes_split),
				result = []
		var that = this
		$.each(splitted,  function(n, e){
			//  = "" is added by FF when {{}} occures inside a HTML tag
			var v = variables.length
				? that.appDataOP.execute(variables.shift().replace(/ = ""/g, '').slice(2, -2))
				: "".replace()
			if (v instanceof Object) {
				v = JSON.stringify(v, null, 2)
			}
			result.push(e, v)
		})
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
		delete o
		window.location.hash = this.makeHash()
	},
	clean: function(){
		this.params = Array.filter(this.params, function(e){
			return $("#"+e.name).length ? true : false
		})
	},
	update: function(o){
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
var locationHash = new hashWorker()

$(document).ready(function(){
	var locale = {},
			lang = $("html").attr("lang") || "en",
			D = DEBUG = $("html[debug]") ? true : false,
			ac = new AC({"D": D}),
			PREFIX = ac.PREFIX,
			trim = s => s.slice(0,100)+"...",
			uuid = $.uuid,
			noop = () => {}

	window.ac = ac

	if (D) {
		$.ajaxSetup({ cache: false });
	}

	/* Gets the nearest ac-dataPaths found from the root node and then stops. It prevents deeper ac-dataPaths from execution.*/
	var getOuterDataPaths = (node) => {
		var dpaths = $("*["+PREFIX+"-dataPath]", node),
				ret = []
		dpaths.each(function(n, e){
			if ($(e).parents("*["+PREFIX+"-dataPath]").length === 0) {
				ret.push(e)
			}
		})
		return $(ret)
	}

	var createRenderHelperDiv = () => {
		var id = $.uuid()
		$("body").append("<div id='ac-"+id+"' class='hidden ac-renderHelper'></div>")
		return $("#ac-"+id)[0]
	}

	var render = function(html, data, cb){
		cb = cb || noop
		var renderHelperDiv = createRenderHelperDiv()
		renderHelperDiv.innerHTML = html

		loadFragments(renderHelperDiv, () => {
			var dp = getOuterDataPaths(renderHelperDiv)

			if(dp.length){
				dp.each(renderDataPath)
			}

			renderHelperDiv.innerHTML = ac.replaceVars($(renderHelperDiv).html())

			var nodesWithSW = ac.getNodesWithShowWhen($(renderHelperDiv))
			$(nodesWithSW).each(function(n, e){
				if (!ac.checkShowWhen(e)) {
					$(this).remove()
				}
			})

			ac.trigger()
			var ret = $(renderHelperDiv).html()
			renderHelperDiv.remove()
			return cb(ret)
		})
	}

	var loadFragment = function(node, cb){
		cb = cb || noop
		//ac.defaultTemplates[node.id] = node.innerHTML

		var URL = $(node).attr(PREFIX + "-dataSource"),
				fragmentURL = $(node).attr(PREFIX + "-fragment")


		if (fragmentURL !== undefined) {
			ac.fragments.get(fragmentURL, function(err, template){
				if (err){
					return cb(err)
				}
				if (URL){
					ac.API.call(URL, $(node).attr(PREFIX+"-post"), function(err, data){
						ac.appDataOP.setContext(data)
						ac.appDataOP.setCurrent(data)
						render(template, data, (html) =>{
							node.innerHTML = html
							cb()
						})
					})
				} else {
					render(template, null, (html) =>{
						node.innerHTML = html
						return cb()
					})
				}
			})
		}
	}

	AC.loadFragment = loadFragment

	var loadFragments = function(context, cb){
		cb = cb || noop

		var fragments = $("*["+PREFIX+"-fragment]", context)

		if (fragments.length === 0) {
			return cb()
		}
		var counter = fragments.length,
				counterFN = (err) => {
					if (--counter === 0) {
						cb(err)
					}
				}

		fragments.each((n, node) => {
			if (ac.checkCondition(node)) {
				loadFragment(node, counterFN)
			} else {
				return counterFN()
			}
		})
	}

	var hideSubDataPaths = function(node){
		var dps = getOuterDataPaths($("*["+PREFIX+"-dataPath]", node)),
				cache = {}

		dps.replaceWith(function(n, e){
			var id = uuid()
			cache[id] = dps[n]
			return "$$"+id+"$$"
		})
		return cache
	}

	var renderDataPath = function(n, node){
		var subDataPathsCache = hideSubDataPaths(node)

		var data = ac.appDataOP.execute(ac.rmMustashes($(node).attr(PREFIX+"-dataPath"))),
				template = node.innerHTML.replace(/ ac-dataPath=".*"/ig, "").trim(),
				currentCache = ac.appDataOP.current

		node.innerHTML = ""
		if (data) {
			data.forEach(function(o){
				ac.appDataOP.setCurrent(o)

				var $innerNode = $(
					$.parseHTML(
						ac.replaceVars("<temp>"+template+"</temp>")
							.replace(/\$\$(.*)\$\$/, p => subDataPathsCache[p.slice(2, -2)])
					)
				)

				var $nodesWithSW = ac.getNodesWithShowWhen($innerNode)

				if ($nodesWithSW.length) {
					$nodesWithSW.each(function(n, el){
						if (ac.checkShowWhen(el)) {
							$(this).removeAttr(PREFIX+"-showWhen")
						} else {
							$(this).remove()
						}
					})
				}

				var dp = getOuterDataPaths($innerNode)

				if(dp.length){
					dp.each(renderDataPath)
				}
				$(node).append($innerNode.children())
			})
		}
		$(node).removeAttr(PREFIX+"-dataPath")
		ac.appDataOP.setCurrent(currentCache)
	}

	//var	lang = $("html").attr("lang") || "en"
	//
	//var x = $.ajax({
	//	url:"/locale/"+$("html").attr("lang")+".json",
	//	success:function(data){
	//		ac.appData.locale = locale = data
	//		//updateLocales()
	//	},
	//	error:function(e, b, c, d){
	//	},
	//	dataType:"json",
	//	async:false
	//})

	var refreshState = function(){
	  var event = jQuery.Event("beforehashchange");
	  $(document).trigger(event)
	  if (event.isDefaultPrevented()){
	    return
	  }
		var state = locationHash.get()
		// TODO probably depreciated
		//if ($.isEmptyObject(state)) {
		//	loadFragment($("body>div")[0])
		//}
		var load = function(o){
			var el = $("#"+o.name)
			el.attr(PREFIX+"-fragment", o[o.name])
				.attr(PREFIX+"-dataSource", o[o.name+"_ds"])
			// detect Bootstrap modal
			var modal = $("#"+o.name).parents(".modal")
			// $(modal).is(":visible") fixes: close modal -> open modal -> you see recent step instead of first but the gluu building process is not in the session. Should be deleted when the lib goes for general use.
			if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || (modal && $(modal).is(":visible")) ) {
				modal.modal()
			}
			loadFragment($("#"+o.name)[0], function(){
				if (state.length) {
					load(state.shift())
				}
			})
		}
		if (state.length) {
			load(state.shift())
		}
	}

	window.onhashchange = function(){
		if (!locationHash.hashChangeSource) {
			refreshState()
			ac.trigger()
		}
		locationHash.hashChangeSource = null
	}

	window.onload = () =>{
		loadFragments($("body"), () => {
			refreshState()
		})
	}

	$("body").on("click", "a,  button", function(e){
		locationHash.hashChangeSource = "internal"

		var $currentTarget = $(e.currentTarget)

		if (!$currentTarget.attr(PREFIX+"-target")) {
			return
		}
		var href = $currentTarget.attr("href")
		if (href && href[0] === "#") {
			e.preventDefault()
			return
		}
		e.preventDefault()
	  var event = jQuery.Event("beforehashchange")
	  $(document).trigger(event)
	  if (event.isDefaultPrevented()){
	    return
	  }
		var targetSelector = $currentTarget.attr(PREFIX+"-target"),
				href = $currentTarget.attr("href"),
				currFragment = $(targetSelector).attr(PREFIX+"-fragment")

		$currentTarget.parents(".nav")
									.find("*[ac-target="+targetSelector+"].active")
									.removeClass("active")
		$currentTarget.addClass("active")

		var spinner = new Spinner($currentTarget)

		if (!ac.checkCondition($currentTarget)) {
			return
		}

		if (href[0] === "/") {
			href = href.slice(1)
		}
		// TODO bring back this optimization
		if (true || currFragment !== href) {
			var t = $(targetSelector)
			if (!t[0]) {
				return
			}
			t.attr(PREFIX+"-fragment", href)
			t.attr(PREFIX+"-dataSource", $currentTarget.attr(PREFIX+"-dataSource") || "")

			loadFragment(t[0], (err) =>{
				if (err) {
					$currentTarget.spinner.error("ERROR: " + lf["message"])
					return
				}
				ac.trigger()
				$currentTarget.spinner.success()

				var r = $currentTarget.attr(PREFIX+"-redirect")
				if (r) {
					window.location = r
					return
				}

				var target = targetSelector.slice(1)
				var d = {}
				d[target] = href
				var ds = t.attr(PREFIX+"-dataSource")
				if (ds) {
					d[target+"_ds"] = ds
				}
				locationHash.update(d)
			})
		}
	})

	// TODO,  optimization: check if $("body").on("submit", "form", ...) works
	$.onAvailable("form",  function(){
		this.attr("method", "POST")
		this.attr("enctype", "multipart/form-data")
	})

	$("body").on("submit",  "form",  function(e){
		e.preventDefault()
	  var event  =  jQuery.Event("beforehashchange");
	  $(document).trigger(event)
	  if (event.isDefaultPrevented()){
	    return
	  }
		locationHash.hashChangeSource = "internal"
		var self = $(this),
		    targetEl = self.attr(PREFIX+"-target"),
				href = self.attr("href"),
				currFragment = $(targetEl).attr(PREFIX+"-fragment"),
				condition = ac.rmMustashes(self.attr(PREFIX+"-condition"))

		var btn = $(e.originalEvent.explicitOriginalTarget)
		if (!btn[0])
		  btn = self.find("[type=submit]")
		var spinner = new Spinner(btn)

		if (!targetEl) {
			$.ajax({
				url: ac.API.fixURL(self.attr("action")),
				data: self.serialize(),
				success: function(e) {
					var error = false
					for(var key in e){
						if (e[key]["@status"] === "error") {
							error = e[key]["message"] || e[key]["error"]
							var errorDiv = btn.parents("form").find(".ac-error."+e[key]["error"])
							if (errorDiv) errorDiv.addClass("show")
							break
						}
					}
					if (error) {
						btn.spinner.error(error)
						return
					}
					btn.spinner.success()
					var r = self.attr(PREFIX+"-redirect")
					if (r) {
						window.location = r
					}
				},
				error:function(e,  status,  error){
					try{
						btn.spinner.error(e.responseJSON.GlobalError.message)
					}catch(TypeError){
						btn.spinner.error(error || "Server not responding.")
					}
				},
				type:"POST"
			})
			return
		}

		if (condition && !ac.appDataOP.execute(condition)) {
			return
		}

		if (href[0] === "/") {
			href = href.slice(1)
		}
		if (true || currFragment !== href) {
			var t = $(targetEl)
			if (!t[0]) {
				return
			}
			t.attr(PREFIX+"-fragment", href)
			var ds = self.attr(PREFIX+"-dataSource")
			if(ds)
  			t.attr(PREFIX+"-dataSource", ds)
  		else
  		  t.attr(PREFIX+"-dataSource", null)

			$.ajax({
				url: ac.API.fixURL(self.attr("action")),
				data: self.serialize(),
				success: function(data) {
					var error = false
					//for(var key in data){
						if (data["status"] === "error") {
							error = data["message"] || data["error"]
							var errorDiv = btn.parents("form").find(".ac-error."+data["error"])
							if (errorDiv){
								errorDiv.addClass("show")
								errorDiv.parent("div").addClass("has-error")
								//$("*[name="+errorDiv.attr(PREFIX+"-for")+"]").addClass("has-error")
							}
							//break
						}
					//}
					if (error) {
						btn.spinner.error(error)
						return
					}
					btn.spinner.success()
					var r = self.attr(PREFIX+"-redirect")
					if (r) {
						window.location = r
						return
					}
					ac.appDataOP.setContext(data)
					loadFragment(t[0], (err) =>{
						ac.trigger()
						var target = targetEl.slice(1)
						var d = {}
						d[target] = href
						d[target+"_ds"] = self.attr(PREFIX+"-dataSource")
						locationHash.update(d)
					})
				},
				error:function(e,  status,  error){
					try{
						btn.spinner.error(e.responseJSON.GlobalError.message)
					}catch(TypeError){
						btn.spinner.error(error || "Server not responding.")
					}
				},
				type:"POST"
			})
		}
	})
})

