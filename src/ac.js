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
		if (D) console.log("START: render(html, data):", trim(html), data)
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
			if (D) console.log("END: render", trim(ret))
			renderHelperDiv.remove()
			return cb(ret)
		})
	}

	var loadFragment = function(node, cb){
		cb = cb || noop
		if (D) console.log("START: loadFragment with node:", node)
		//ac.defaultTemplates[node.id] = node.innerHTML

		var URL = $(node).attr(PREFIX + "-dataSource"),
				fragmentURL = $(node).attr(PREFIX + "-fragment")

		if (D) console.log("Found URL:", URL, "Fragment:", fragmentURL)

		if (fragmentURL !== undefined) {
			ac.fragments.get(fragmentURL, function(err, template){
				if (err){
					console.error(err)
					return cb(err)
				}
				if (URL){
					ac.API.call(URL, $(node).attr(PREFIX+"-post"), function(err, data){
						ac.appDataOP.setContext(data)
						ac.appDataOP.setCurrent(data)
						//console.log(template, data)
						render(template, data, (html) =>{
							node.innerHTML = html
							if (D) console.log("END: loadFragment w/ data", node)
							cb()
						})
					})
				} else {
					render(template, null, (html) =>{
						node.innerHTML = html
						if (D) console.log("END: loadFragment wo data", node)
						return cb()
					})
				}
			})
		}
	}

	AC.loadFragment = loadFragment

	var loadFragments = function(context, cb){
		if (D) console.log("START: loadFragments with context", context)
		cb = cb || noop

		var fragments = $("*["+PREFIX+"-fragment]", context)

		if (fragments.length === 0) {
			if (D) console.log("END: loadFragments with no fragments found", context)
			return cb()
		}
		//if (D) console.log("loadFragments: fragments found:", fragments)
		var counter = fragments.length,
				counterFN = (err) => {
					if (--counter === 0) {
						if (D) console.log("END: loadFragments", context)
						cb(err)
					}
				}

		fragments.each((n, node) => {
			if (ac.checkCondition(node)) {
				if (D) console.info(" Condition ", $(node).attr(PREFIX + "-condition") || "'no condition'", " satisfied")
				loadFragment(node, counterFN)
			} else {
				if (D) console.log("Fragment skipped. Condition ", $(node).attr(PREFIX + "-condition"), " not satisfied")
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
		if (D) console.info("START: renderDataPath with node:", node)
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
		if (D) console.log("END: renderDataPath")
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
	//		console.error("Problem with Locale file at /locale/"+$("html").attr("lang")+".json\n",  c)
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
		if (D) console.log("href is", href)
		// TODO bring back this optimization
		if (true || currFragment !== href) {
			if (D) console.log("currFragment", targetSelector)
			var t = $(targetSelector)
			if (!t[0]) {
				console.error("Target element", targetSelector, "not found!")
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
		if (D) console.log($currentTarget, targetSelector, href)
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
			if (D) console.log("condition "+condition+" not satisfied")
			return
		}
		if (D) console.log("condition "+condition+" satisfied")

		if (href[0] === "/") {
			href = href.slice(1)
		}
		if (D) console.log("href is", href)
		if (true || currFragment !== href) {
			if (D) console.log("currFragment", targetEl)
			var t = $(targetEl)
			if (!t[0]) {
				console.error("Target element "+targetEl+" not found!")
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
					console.log(data)
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
