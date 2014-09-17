
/**
 * ContextMenu renders a right-click menu using 
 * 1. The content you provide in the DIV with the given 'sourceId'.
 * 2. For right-clicks over the <div> with the given 'targetId'.
 */
function ContextMenu(id,sourceId,targetId,targetFunction) {
	this.id = id;    //name of your ContextMenu object e.g. 'MENUBAR.contextMenu'
	this.sourceId = sourceId; 	//id of the div to display as the menu
	this.targetId=targetId;  	//id of element to override context menu events on 
	this.disabled = false;
	this.mouseOverContext = false;
	this.targetFunction = targetFunction;  //optional name of the callback function that determines when to show this contextmenu
	this.target=null;   //target element right-clicked in the DOM

	// call from the body onmousedown event, passing the event if standards compliant
	this.mouseDown = function(evt) {
		if (this.disabled  || this.mouseOverContext) {return;}
 
		// IE is evil and doesn't pass the event object
		if (evt == null) {evt = window.event;} 
 
		if(evt.button === 2) {
			var targetElem = evt.target != null ? evt.target : evt.srcElement;
			//Was the mouseDown over my targetId? 
			var hitMe = this.isTargetMeOrMyParents(targetElem);
			if(!hitMe) {
				return false;    //mousedown event is not for me!
			}
			//If a function or function name was supplied - call it
			try { 
				if(typeof this.targetFunction === 'function') {
					if( this.targetFunction.call(targetElem)) {
						this.show(evt);
					}
				} else 
				if(typeof  eval(this.targetFunction) === 'function') {
					var func = eval(this.targetFunction);
					if( func.call(targetElem)) {
						this.show(evt);
					}
				} else { 
					this.show(evt);
				}
			} catch(exception) {
			}
			this.target = targetElem;
		} else {
			this.target = null;
			this.close ();
		}
		return false;
	};
	
	this.isTargetMeOrMyParents = function(targetElem){
		if(null == targetElem) {
			return false;
		}
		if(this.targetId ===  targetElem.id) {
			return true;
		}
		return  this.isTargetMyParent(targetElem.parentNode);
	};
	this.isTargetMyParent = function(parentElem){
		if(null == parentElem) {
			return false;
		} else 
		if(null !== parentElem.id  && parentElem.id === this.targetId  ) {
			return true;
		} else {
			return this.isTargetMyParent(parentElem.parentNode); 
		}
	};
	
	this.getContextTarget = function() {
		return  this.target;
	};
	this.getContextTargetId = function() {
		return  this.target.id;
	};
	
	this.close = function() {
		var contextDiv = document.getElementById(this.sourceId);
		contextDiv.style.display = 'none';
	};
	this.disable = function() {
		this.close();
		this.disabled = true;	
	};
	// call from the target DIVs oncontextmenu event, passing the event
	// if this function returns false, the browser's context menu will not show up
	this.show = function(evt) {
		if (this.disabled  || this.mouseOverContext) {return;}
	 
		// IE is evil and doesn't pass the event object
		if (evt == null) { evt = window.event; }

		// document.body.scrollTop does not work in IE
		var scrollTop = document.body.scrollTop ? document.body.scrollTop :
			document.documentElement.scrollTop;
		var scrollLeft = document.body.scrollLeft ? document.body.scrollLeft :
			document.documentElement.scrollLeft;
		var contextDiv = document.getElementById(this.sourceId);
		// hide the menu first to avoid an "up-then-over" visual effect
		contextDiv.style.display = 'none';
		contextDiv.style.left = evt.clientX + scrollLeft + 'px';
		contextDiv.style.top = evt.clientY + scrollTop + 'px';
		contextDiv.style.display = 'block';
	 
	}
	//once the contextmenu div has been built in the DOM
	//call this method to 'wire up ' the events on it!
	this.bindEvents = function() {
		bindEvent(document.body, 'mousedown',function(event) {
			eval(id+'.mouseDown(event)');
		}) ;
		var contextDivElem = document.getElementById(this.sourceId);
		if(null!=contextDivElem) {
			bindEvent(contextDivElem, 'mouseover',function(event) {
				eval(id+'.mouseOverContext = true');
			}) ;
			bindEvent(contextDivElem, 'mouseout',function(event) {
				eval(id+'.mouseOverContext = false');
			}) ;
		}
		bindEvent(document.body, 'contextmenu',function(event) {
			return false;
		}) ;
	};
	//IF the context menu div is already in the DOM
	var contextDivElem = document.getElementById(this.sourceId);
	if(null!==contextDivElem) {
		this.bindEvents();
	}
};

