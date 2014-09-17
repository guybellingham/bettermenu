/**
 * Contains functions common to BetterContextMenu, BetterMenuBar, BetterTable ..etc
 */
 function bindEvent(element, type, handler) {
    if (element.addEventListener) {
        element.addEventListener(type, handler, false);
    } else {
        element.attachEvent('on'+type, handler);
    }
};

function getTimestamp() {
	var today=new Date();
	var h=today.getHours();
	var	hours = pad2DigitNumber(h);
	var m=today.getMinutes();
	var	minutes = pad2DigitNumber(m);
	var s=today.getSeconds();
	var	seconds = pad2DigitNumber(s);
	var millis=today.getMilliseconds();
	return  hours+':'+minutes+':'+seconds+'.'+millis;
};
function pad2DigitNumber(nbr){
	if(nbr < 10){
		return '0'+nbr;
	}
	return ''+nbr;
};

function getCookieEnabled () {
	var cookieEnabled = false;
	if (typeof navigator.cookieEnabled==='undefined' ){ 
		document.cookie="testcookie"
		cookieEnabled=(document.cookie.indexOf("testcookie")!=-1)? true : false;
	} else {
		cookieEnabled = navigator.cookieEnabled;
	}
	return cookieEnabled;
};

//Find a parent node in the DOM of the given type(tagName)
function findParentElementOfType(elem,type) {
	if(null != elem.parentNode) {
		if(type.equalsIgnoreCase(elem.parentNode.tagName)) {
			return elem.parentNode;
		} else {
			return findParentElementOfType(elem.parentNode,type);
		}
	} else {
		return null;
	}
};
function getTextInTableRow(row) {
	var cells = row.getElementsByTagName("TD");
	var rowText = null;
	for (var j = 0;j < cells.length;j++) {
		cell += cells[j];
		var nodes = cell.childNodes;
		for (var k = 0;k < nodes.length;k++) {
			var node = nodes[k];
			if(node.nodeType === 3) {
				rowText += node.nodeName;
				rowText += ' ';
			}
		}
	}
	return rowText;
};
function getInputValuesInTableRow(row) {
	var inputs = row.getElementsByTagName("INPUT");
	var rowText = null;
	for (var j = 0;j < inputs.length;j++) {
		rowText += inputs[j].value;
		rowText += ' ';
	}
	return rowText;
};
if(!String.prototype.equalsIgnoreCase) { 
	String.prototype.equalsIgnoreCase = function( str ) {
		return this.toLowerCase() === str.toLowerCase();
	}
};
//IE8 has no indexOf function ..sigh - needed by cookie and context menu
if (!Array.prototype.indexOf)   {

	Array.prototype.indexOf = function(searchElement /*, fromIndex */) {
		"use strict";

		if (this === void 0 || this === null) throw new TypeError();

		var t = Object(this);
		var len = t.length >>> 0;
		if (len === 0) {  return -1; } 

		var n = 0;
		if (arguments.length > 0)
		{
			 n = Number(arguments[1]);
			 if (n !== n) 
			{
				n = 0;
			} else 
			if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) 
			{
				n = (n > 0 || -1) * Math.floor(Math.abs(n));
			}
		}

		if (n >= len) {  return -1; }

		var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);

		for (; k < len; k++)  {
			if (k in t && t[k] === searchElement) 
			{
				return k;
			}
		}
		return -1;
	 };
  };
  //IE8 has no Function.prototype.bind method!
  if (!Function.prototype.bind) {
	Function.prototype.bind = function (oThis) {
	if (typeof this !== "function") {
		// closest thing possible to the ECMAScript 5 internal IsCallable function
		throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
	}

	var aArgs = Array.prototype.slice.call(arguments, 1), 
		fToBind = this, 
		fNOP = function () {},
		fBound = function () {
				return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
					aArgs.concat(Array.prototype.slice.call(arguments)));
		};

	fNOP.prototype = this.prototype;
	fBound.prototype = new fNOP();

	return fBound;
  };
}

  function JSONToObject(jsonString){
		var object = null;
		if (typeof JSON !== 'undefined'){
			object = JSON.parse(jsonString);
		}
		return object;
	};
function ObjectToJSON(object) {
		var objectJSON = null;
		if (typeof JSON !== 'undefined'){
			objectJSON = JSON.stringify(object);
		}
		return objectJSON;
	};

function getCookie(c_name) {
		var c_value = document.cookie;
		var c_start = c_value.indexOf(" " + c_name + "=");
		if (c_start == -1) {
			c_start = c_value.indexOf(c_name + "=");
		}
		if (c_start == -1) {
			c_value = null;
		} else {
			c_start = c_value.indexOf("=", c_start) + 1;
			var c_end = c_value.indexOf(";", c_start);
			if (c_end == -1) {
				c_end = c_value.length;
			}
			c_value = unescape(c_value.substring(c_start,c_end));
		  }
		return c_value;
	};

function setCookie(c_name,value,exdays) {
		var exdate=new Date();
		exdate.setDate(exdate.getDate() + exdays);
		var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
		document.cookie=c_name + "=" + c_value;
	};


function consoleInfo(message){
	if(typeof console != 'undefined') {
		console.log('info: '+message);
	}
};
function consoleError(message){
	if(typeof console != 'undefined') {
		console.log('ERROR: '+message);
	}
};
	
if (!getCookieEnabled()) {
	window.status += ' Warning Cookies are disabled!';
}
if (typeof JSON === 'undefined'){
	window.status += ' Warning browser has no JSON support!';
}

/**
 * Build an Ellipsis object by passing in the 'busy' DIV element in the DOM in which to display
 * the given 'busyText' and animated ellipsis. Plus a flag whether to build a modal 'layer' over the page 
 * when displaying this ellipsis. 
 */
function Ellipsis(busyDiv,busyText,modalFlag) 
{
	this.busyDiv = busyDiv;
	this.busyText = busyText;
	this.modalFlag = modalFlag;
	this.dots = ['&nbsp;&nbsp;&nbsp;', '.&nbsp;&nbsp;', '..&nbsp;', '...'];
	this.run = false;
	this.count = 0;
	this.modalTop = 0;   //overrides the offset of the modal layer from the top of the document
	this.modalLeft = 0;
	this.modalWidth = 0;
	this.modalHeight = 0;
	
	/**
	 * Shows the given text and animated ellipsis in the given 'busyDiv'. 
	 * If modal = true, also adds a protective div to the page.
	 */
	this.start = function() {
		this.run = true;
		if(this.modalFlag) {
			var overdiv = document.createElement("div");
			overdiv.id = "EllipsisOverdiv";
			overdiv.className = "overdiv";
			if(this.modalHeight === 0) {
				this.modalHeight = getDocumentHeight();
			}
			if(this.modalWidth === 0) {
				this.modalWidth = getDocumentWidth();
			}
			overdiv.style.top = this.modalTop +'px';
			overdiv.style.left = this.modalLeft +'px';
			overdiv.style.height = this.modalHeight +'px';
			overdiv.style.width = this.modalWidth +'px';
			document.body.appendChild(overdiv);
		}
		this.count = 0;
		this.busyDiv.style.display='block';
		this.animate();
	};
	this.animate = function() {
		if(this.run) {
			window.setTimeout(function(){
				this.count++;
				this.busyDiv.innerHTML = this.busyText + this.dots[this.count%4];
				this.animate();
			}.bind(this), 250);
		}
	};
	this.stop = function() {
		this.run = false;
		window.setTimeout( function() { 
			this.busyDiv.innerHTML = '';
			this.busyDiv.style.display='none';
			this.busyDiv = null;
			this.busyText = null;
		}.bind(this), 300);
		var overDiv = document.getElementById('EllipsisOverdiv');
		if(overDiv !== null) {
			document.body.removeChild(overDiv);
		}
		this.modalFlag = false;
	};

};

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
};
function getDocumentWidth() {
          var x = 0;
          if (self.innerHeight)
          {
                  x = self.innerWidth;
          }
          else if (document.documentElement && document.documentElement.clientHeight)
          {
                  x = document.documentElement.clientWidth;
          }
          else if (document.body)
          {
                  x = document.body.clientWidth;
          }
          return x;
  };

  function getDocumentHeight() {
          var y = 0;
          if (self.innerHeight)
          {
                  y = self.innerHeight;
          }
          else if (document.documentElement && document.documentElement.clientHeight)
          {
                  y = document.documentElement.clientHeight;
          }
          else if (document.body)
          {
                  y = document.body.clientHeight;
          }
          return y;
  };