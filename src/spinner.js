;(function ( $, window, document, undefined ) {

	var pluginName = "spinner",
			defaults = {
				propertyName: "value"
			};

	function Plugin( element, options ) {
		this.element = element;
		this.options = $.extend( {}, defaults, options) ;

		this._defaults = defaults;
		this._name = pluginName;

		this.init();
	}

	Plugin.prototype = {

		init: function() {

		},
		add:function(){
			console.log(222)
			this.attr("title","Waiting for response")
			this.find(".ac-spin").remove()
			this.append(" <i class='fa fa-spinner fa-spin ac-spin'></i>")
		},
		remove:function(){
			this.removeAttr("title")
			var spinner=this.find(".fa-spin")
			spinner.removeClass("fa-spinner fa-spin")
						 .addClass("fa-smile-o")
						 .addClass("hide-delay")
			setTimeout(function(){spinner.remove()},1200)
		},
		error:function(err){
			this.attr("title","Error! "+err)
			var spinner=this.find(".fa-spin")
			spinner.removeClass("fa-spinner fa-spin")
						 .addClass("fa-frown-o")
				//.addClass("hide-delay")
			//setTimeout(function(){spinner.remove()},1200)
		}
	};


	$.fn[pluginName] = function ( options ) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName,
				new Plugin( this, options ));
			}
		});
	};
})( jQuery, window, document );
