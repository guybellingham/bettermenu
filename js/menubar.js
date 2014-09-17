/**
 * MenuBar &copy; G Bellingham-Smith July 2013.
 * Contains a 'model with Menus and MenuItems, 
 * a 'controller' that alters the model, and 
 * a renderer.
 */
function MenuBar(callbackOrJSON) 
{
	this.name = 'MENUBAR';
	this.model = null;
	if(typeof callbackOrJSON === 'function') 
	{
		this.model = callbackOrJSON.call();
	}
	if(typeof callbackOrJSON === 'String') 
	{
		this.model = this.getObjectFromJSON(callbackOrJSON);
	}
	
	//The Controller and its Walker have a MenuBarModel
	this.controller = new MenuBarController(this.model);
	
	//The View/Renderer has a MenuBarModel and a DIV id to render into
	this.renderer = new MenuBarHTMLRenderer(this.model,'menubarDiv');
	this.renderer.display();
	
	this.menubarBusyDiv = null;   	//Busy div
	this.ellipsis = null; 			//animated Ellipsis object
	
	//Build a ContextMenu with a unique id using the id of the 'source' DIV, 'target' DIV and (optional) callback function (see below)
	this.contextMenu = new ContextMenu('MENUBAR.contextMenu','menuBarContextMenuDiv','menubarDiv','MENUBAR.contextMenuTargetFunction');
	//this.contextMenu.bindEvents();

	this.setMenuBarModel = function(menubarModel) {
		this.model=menubarModel;
		this.controller.setMenuBarModel(menubarModel); 
		this.renderer.setMenuBarModel(menubarModel); 
	};
	this.display = function(){
		this.renderer.display();
	};
	this.clickMenu = function(menuId){
		this.controller.clickMenuItemById(menuId);  
	};
	this.selectMenu = function(menuId){
		this.controller.expandMenuById(menuId);
		this.renderer.display();
	};
	this.hideMenu = function(menuId){
		this.controller.hideMenuById(menuId);
		this.renderer.display();
	};
	this.moveMenu = function(menuId){
		this.controller.moveMenuById(menuId);
		this.renderer.display();
	};
	this.showAllMenus = function(){
		this.controller.showAllMenus();
		this.renderer.display();
	};
	this.disable = function() {
		this.controller.disableMenuBar();
		this.renderer.display();
	};
	this.enable = function() {
		this.controller.enableMenuBar();
		this.renderer.display();
	};
	/**
	 * Callback function passed to the ContextMenu - this is how you 'link' the context menu to the MenuBar items
	 * ContextMenu uses this to figure out when to override the system context menu on a right-click. 
	 * In this case when a SPAN or Anchor with 'menu' in its className is clicked!
	 */
	this.contextMenuTargetFunction = function(){
		if(!MENUBAR.model.disabled){
			if(this!==null) {
				if(this.className.indexOf('menu')>-1) { 
					if(this.tagName==='SPAN'||this.tagName==='A'){
						return true;
					}
				}
			}
		}
		return false;
	};
	
	this.closeContextMenu = function() {
		this.contextMenu.close();
	};
	this.getContextTargetId = function(){
		return this.contextMenu.getContextTargetId();
	};
	//This is how to load the MenuBar from a JSON string which you would
	//fetch from your server using an AJAX GET
	this.fromJSON = function(JSONString) {
		var newMenuBarModel = this.getModelFromJSON(JSONString);
		this.setMenuBarModel(newMenuBarModel);
		this.renderer.display();
	};
	this.getModelFromJSON = function(JSONString) {
		return JSONToObject(JSONString);
	};
	//return the MENUBAR model as a JSON String
	this.toJSON = function(){
		return  ObjectToJSON(this.model);
	};
	this.loadOptions = function() {
		this.controller.loadMenuBarOptions();
		this.renderer.display();
	};
	this.saveOptions = function() {
		this.controller.saveMenuBarOptions();
	};
	this.resetOptions = function() {
		this.controller.undoMenuBarOptions();
		this.controller.resetMenuBarOptions();
		this.renderer.display();
	};
	this.startBusy = function(displayText,modalFlag) {
		this.disable();
		if(this.menubarBusyDiv === null) {
			this.menubarBusyDiv = document.getElementById('menubarBusyDiv');
		}
		this.ellipsis = new Ellipsis(menubarBusyDiv,displayText,modalFlag);
		this.ellipsis.start();
	};
	this.stopBusy = function() {
		this.ellipsis.stop();
		this.enable();
		this.display();
	};
};

/**
 * MenuBarModel &copy; G Bellingham-Smith July 2013.
 * serves to contain Menus and MenuItems.
 * 
 * It always displays its children.
 * It is the 'Model'. 
 * It has a series of 'Menu' trees.
 */
function MenuBarModel(name,menubarChildren) {
	this.name = name;  //Identifying name of this menubar model
	this.children = menubarChildren;  //Array of Menus
	this.collapsed = false;
	this.disabled = false;
	this.fixed = true;  //MenuBar float at the top of the page
	this.options = new MenuBarOptions();
};
/**
 *  User settings that are persisted to/from JSON. 
 */
function MenuBarOptions() {
	//must not have a reference to menubar
	this.startingMenuId =  'Home';   //starting menu that should be opened
	this.hiddenMenuIds = new Array();    //Array of ids of menus and items hidden by the user
	this.menuBarMoves = new Array();    //Array of MenuBarMoves
};
function MenuBarMove(menuId,oldPos,newPos) {
	this.menuId = menuId;  //id of moved menu or item
	this.oldPos = oldPos;  //position it moved from
	this.newPos = newPos;  //position it moved to
}
/**
 * Menu serves to contain other Menus and MenuItems.
 * When rendered a Menu contains a MenuList. 
 * When clicked it displays its children.
 * When constructed it adds itself to its parents children.
 */
function Menu(displayText,parentMenu,cssWidth) {
	//Menu and MenuItem must not contain a direct reference to their parentMenu or MenuBar 
	//because it causes cyclic reference errors when converting MenuBarModel to JSON!
	//A Menu only has references to its children!
	this.level= null;  //Calculated by Walker
	this.sequenceNumber = null;  //Calculated by Renderer
	this.text =  displayText;
	this.menuId = null;  //Calculated by Walker
	this.parentMenuId = null;
	this.children = new Array();
	this.width=cssWidth;
	this.selected = false;   //Is this menu selected/expanded?
	this.visible = true;   //User may (temporarily) hide a menu?
	this.isMenu = true;   //instanceof doesn't work with JSON objects

	if(null!==parentMenu)
	{
		parentMenu.addChild(this);
	}
	this.addChild = function(child) {
		//careful here - child is not fully constructed!
		if(this.children.length===0)
		{
			child.sequenceNumber = 0;
		} else {
			var index = (this.children.length - 1);
			var previousChild = this.children[index];
			if(null!==previousChild.sequenceNumber) {
				child.sequenceNumber = (previousChild.sequenceNumber + 1);
			}
		}
		this.children.push(child);
	};
};
/**
 * MoreMenu is a subclass of Menu. It serves to contain a drop-down list of MenuItems. 
 * When rendered a MoreMenu looks like a drop-down list. 
 * When clicked it displays its children MenuItems in a vertical list.
 * When clicked again it hides its children. 
 */
function MoreMenu() {
	this.isMoreMenu = true;   //instanceof doesn't work with JSON objects and subclasses!
	//Only adds MenuItems - don't care about sequence numbers!
	this.addChild = function(child) {
		if(child instanceof MenuItem) {
			this.children.push(child);
		}
	};
};

/**
 * Build a MenuItem for a Menu level (1,2,3) with optional 
 * parent and sibling menus.
 * A MenuItem has text and is always a 'leaf' having no children.
 * A MenuItem can have a 'parent' (Menu).
 * A MenuItem can have either a linkURL or an onclickFunction. 
 */
function MenuItem(displayText,parentMenu,cssWidth,urlOrOnclickObj) {
	//Menu and MenuItem must not contain a direct reference to their parentMenu or MenuBarModel 
	//because it causes cyclic reference errors when converting MenuBarModel to JSON!
	this.level= null;  			//Calculated by Walker
	this.sequenceNumber = null;  	//Calculated by Renderer
	this.text =  displayText;
	this.menuId = null;  			//Calculated by Walker
	this.parentMenuId = null;   	//Calculated by Walker
	this.width=cssWidth;
	this.selected = false;
	this.visible = true;   //User may (temporarily) hide a menuitem?
	this.linkURL = null;
	this.onclickFunction = null;	
	this.isMenuItem = true;   //instanceof doesn't work with JSON objects
	
	if ( typeof  urlOrOnclickObj === 'string') {
		this.linkURL = urlOrOnclickObj;
	} else
	if(urlOrOnclickObj instanceof  Object) {
		if(urlOrOnclickObj.url) {
			this.linkURL = urlOrOnclickObj.url;
		}
		if(urlOrOnclickObj.onclick) {
			this.onclickFunction = urlOrOnclickObj.onclick;
		}
	} 

	if(null!==parentMenu){
		parentMenu.addChild(this);
		//this.parentMenuId=parentMenu.menuId;  - cant do it here
	}
};
/**
 * Used by the MenuBarController to access and maintain 
 * the Menus and MenuItems in a MenuBarModel (often recursively).
 */
function MenuBarWalker(menubarModel) {
	this.menubarModel = menubarModel;

	this.setMenuBarModel = function(newMenuBarModel) {
		this.menubarModel = newMenuBarModel;
	};	
	/**
	 * Walks the MenuBar assigning menuIds and level.
	 */
	this.assignMenuIds = function() {
		for (var i = 0;i < this.menubarModel.children.length;i++) {
			var menu = this.menubarModel.children[i];
			var level = 0;
			menu.parentMenuId = null;
			menu.level = level;
			if(menu.isMenuItem) 
			{
				menu.menuId = menu.text;
			} else  {
				menu.menuId = menu.text;
				this.assignSubMenuIds(level,menu, menu.text);
			}
		}
	};
	this.assignSubMenuIds = function(level,subMenu, parentIds) {
		level++;
		for (var i = 0;i < subMenu.children.length;i++) {
			var menu = subMenu.children[i];
			var menuId = parentIds+'_'+menu.text;
			menu.parentMenuId = parentIds;
			menu.level = level;
			if(menu.isMenuItem) 
			{
				menu.menuId = menuId;
			} else  {
				menu.menuId = menuId;
				this.assignSubMenuIds(level,menu,menuId);
			}
		}
	};
	this.showAllMenus = function() {
		for (var i = 0;i < this.menubarModel.children.length;i++) {
			var menu = this.menubarModel.children[i];
			if(!menu.visible) 
			{
				menu.visible = true;
			}
			if(!menu.isMenuItem) 
			{
				this.showAllSubMenus(menu);
			}
		}
	};
	this.showAllSubMenus = function(subMenu) {
		for (var i = 0;i < subMenu.children.length;i++) {
			var menu = subMenu.children[i];
			if(!menu.visible) 
			{
				menu.visible = true;	
			}
			if(!menu.isMenuItem) 
			{
				this.showAllSubMenus(menu);
			}
		}
	};
 	/**
	 * Returns the first occurrence of a Menu or MenuItem 
	 * with the given 'unique' menuId.
	 */
	this.findMenuById = function(menuId) {
		var theMenu = null;
		for (var i = 0;i < this.menubarModel.children.length;i++) {
			var menu = this.menubarModel.children[i];
			if(menu.isMenuItem ) 
			{
				if(menu.menuId === menuId) 
				{
					return menu;
				}
			} else {
				if(menu.menuId === menuId) 
				{
					return menu;
				}
				theMenu = this.findSubMenuById(menu,menuId);
				if(null!==theMenu) 
				{
					return theMenu;
				}
			} 
		}
		return theMenu;
	};
	//recursive finder
	this.findSubMenuById = function(menu,menuId) {
		var theMenu = null;
		for (var i = 0;i < menu.children.length;i++) {
			var childmenu = menu.children[i];
			if(childmenu.isMenuItem){
				if(childmenu.menuId === menuId) {
					return childmenu;
				}
			} else {
				if(childmenu.menuId === menuId) {
					return childmenu;
				}
				theMenu = this.findSubMenuById(childmenu,menuId);
				if(null!==theMenu) {
					return theMenu;
				}
			} 
		}
		return theMenu;
	};
	/**
	 * Returns the first occurrence of a Menu or MenuItem 
	 * with the same text as the given menuText.
	 */
	this.findMenuByText = function(menuText) {
		var theMenu = null;
		for (var i = 0;i < this.menubarModel.children.length;i++) {
			var menu = this.menubarModel.children[i];
			if(menu.isMenuItem) {
				if(menu.text === menuText) {
					return menu;
				}
			} else  {
				if(menu.text === menuText) {
					return menu;
				}
				theMenu = this.findSubMenuByText(menu,menuText);
				if(null!==theMenu) {
					return theMenu;
				}
			}
		}
		return theMenu;
	};
	//recursive finder
	this.findSubMenuByText = function(menu,menuText) {
		var theMenu = null;
		for (var i = 0;i < menu.children.length;i++) {
			var childmenu = menu.children[i];
			if(childmenu.isMenuItem){
				if(childmenu.text === menuText) {
					return childmenu;
				}
			} else {
				if(childmenu.text === menuText){
					return childmenu;
				}
				theMenu = this.findSubMenuByText(childmenu,menuText);
				if(null!==theMenu) {
					return theMenu;
				}
			}
		}
		return theMenu;
	};
	/**
	 * Returns an Array containing all the parent Menus of the given menu or menuitem.
	 */
	this.findParentMenus = function(menu) {
		var parentMenuArray = new Array();
		if(null!==menu.parentMenuId){
			var parentMenu = this.findMenuById(menu.parentMenuId);
			parentMenuArray.push(parentMenu);
			if(null!==parentMenu.parentMenuId) {
				this.findParentMenu(parentMenu,parentMenuArray);
			} 
		}
		return parentMenuArray;
	};
	this.findParentMenu = function(menu, parentMenuArray) {
		if(null!==menu.parentMenuId){
			var parentMenu = this.findMenuById(menu.parentMenuId);
			parentMenuArray.push(parentMenu);
			if(null!==parentMenu.parentMenuId) {
				this.findParentMenu(parentMenu,parentMenuArray);
			} 
		}
	};
	
	this.closeMenu = function(menuId) {
		var menu = this.findMenuById(menuId);
		if(null!==menu) {
			this.closeMenus(menu);
		}
	};
	/**
	 * Close all selected menus on the same level 
	 * as the given menu and below.
	 */
	this.closeMenus = function(menu) {
		if(null!==menu.parentMenuId) {
			menu = this.findMenuById(menu.parentMenuId);
			for (var i = 0;i < menu.children.length;i++) {
				var childmenu = menu.children[i];
				if( childmenu.isMoreMenu){
					childmenu.selected = false;
				} else 
				if(childmenu.isMenu) {
					childmenu.selected = false;
					this.closeSubMenus(childmenu);
				} 
			}
		} else {
			this.closeAllMenus();
		}
	};
	/**
	 * Close all menus in the menubar.
	 */
	 this.closeAllMenus = function() {
		for (var i = 0;i < this.menubarModel.children.length;i++) {
			var childmenu = this.menubarModel.children[i];
			if( childmenu.isMoreMenu){
				childmenu.selected = false;
			} else 
			if(childmenu.isMenu){
				childmenu.selected = false;
				this.closeSubMenus(childmenu);
			}
		}
	 };
	 /**
	  * Recursively close all menus within the given menu.
	  */
	this.closeSubMenus = function(menu) {
		for (var i = 0;i < menu.children.length;i++) {
			var childmenu = menu.children[i];
			if( childmenu.isMoreMenu){
				childmenu.selected = false;
			} else 
			if(childmenu.isMenu){
				childmenu.selected = false;
				this.closeSubMenus(childmenu);
			} 
			
		}
	};
	
};

/**
 * MENUBAR CONTROLLER functions follow.
 * Changes the 'state' of the menubar model in response to 'events'.
 * Has a MenuBarWalker to do recursive stuff on the menubar model. 
 */
function MenuBarController(menubarModel) {	
	this.menubarModel=menubarModel;
	this.walker = new MenuBarWalker(menubarModel);
	//Once the menus in the menubar are built - then you can assign all the 'hierarchical' menuIds
	this.walker.assignMenuIds();
	this.currentMenu=null;  //currently open menu or null

	this.setMenuBarModel = function(newMenuBarModel) {
		this.menubarModel = newMenuBarModel;
		this.walker.setMenuBarModel(newMenuBarModel);
	};	
	this.handleMenuClick = function(menuId) {
		this.expandMenuById(menuId);
		MENUBAR.display();
	};
	this.expandMenuById = function(menuId) {
		var menu = this.walker.findMenuById(menuId);
		this.expandMenu(menu); 
	};
	this.expandMenu = function(menu) {
		if(null != menu) {
			this.walker.closeAllMenus();  //reset all other menus
			menu.selected = true;
			this.currentMenu = menu;  //set the currently open menu
			this.menubarModel.options.startingMenuId = menu.menuId;  //set starting menu id
			var parentMenuArray = this.walker.findParentMenus(menu);
			//Expand all the parent menus!
			if( parentMenuArray  instanceof Array){
				for (var i = 0;i < parentMenuArray.length;i++) {
					var parentMenu = parentMenuArray[i];
					parentMenu.selected = true;
				}
			}
		}
	};
	this.getCurrentMenu = function() {
		return  this.currentMenu;
	};
	this.handleMoreMenuClick = function(menuId){
		var moremenu = this.findMenuById(menuId);
		if(moremenu.selected) {
			this.collapseMoreMenu(moremenu);
		} else {
			this.expandMoreMenu(moremenu);
		}
		MENUBAR.display();
	}
	this.expandMoreMenu = function(menu) {
		menu.selected = true;
	};
	this.collapseMoreMenu = function(menu){
		menu.selected = false;
	};
	this.collapseMenuBar = function(){
		this.menubarModel.collapsed = true;
	};
	this.expandMenuBar = function(){
		this.menubarModel.collapsed = false;
	};
	this.disableMenuBar = function() {
		this.menubarModel.disabled = true;
	};
	this.enableMenuBar = function() {
		this.menubarModel.disabled = false;
	};
	this.fixMenuBar = function() {
		this.menubarModel.fixed = true;
	};
	this.unfixMenuBar = function() {
		this.menubarModel.fixed = false;
	};
	this.showAllMenus = function() {
		this.clearHiddenMenuIds();
		this.walker.showAllMenus();
	};
	this.findMenuById = function(menuId) {
		return this.walker.findMenuById(menuId);
	};
	this.findMenuByText = function(menuText) {
		return this.walker.findMenuByText(menuText);
	};
	this.findParentMenus = function(menu) {
		return this.walker.findParentMenus(menu);
	};

	/**
	 * Expand the Menus down to the item with the given id. 
	 * Rebuild the DOM.
	 * Click the MenuItem link with the given id in the DOM.
	 */
	this.clickMenuItemById = function(itemId) {		
		this.expandMenuById(itemId);
		MENUBAR.display();
		var anchor = document.getElementById(itemId);
		if(anchor) {
			anchor.click();
		}
	};
	this.hideMenuById = function(menuId) {
		var menu = this.walker.findMenuById(menuId);
		if(null!==menu) {
			menu.visible = false;
			this.addHiddenMenuId(menuId);
		}
	};
	this.showMenuById = function(menuId) {
		var menu = this.walker.findMenuById(menuId);
		if(null!==menu) {
			menu.visible = true;
			this.deleteHiddenMenuId(menuId);
		}
	};
	this.addHiddenMenuId = function(hiddenMenuId) {
		this.menubarModel.options.hiddenMenuIds.push(hiddenMenuId);
	};
	this.deleteHiddenMenuId = function(hiddenMenuId) {
		var hiddenArr = this.menubarModel.options.hiddenMenuIds;
		for (var i = 0;i < hiddenArr.length;i++) {
			if(hiddenArr[i] === hiddenMenuId) {
				hiddenArr.splice(i,1);
			}
		}
	};
	this.clearHiddenMenuIds = function() {
		this.menubarModel.options.hiddenMenuIds.length = 0;
	};
	this.getHiddenMenuIds = function() {
		return  this.menubarModel.options.hiddenMenuIds;
	};
	this.addMenuBarMove = function(menuBarMove) {
		this.menubarModel.options.menuBarMoves.push(menuBarMove);
	};
	this.deleteMenuBarMove = function(menuBarMove) {
		var menuBarMoveArr = this.menubarModel.options.menuBarMoves;
		for (var i = 0;i < menuBarMoveArr.length;i++) {
			if(menuBarMoveArr[i] instanceof MenuBarMove &&  menuBarMoveArr[i].menuId === menuBarMove.menuId) {
				menuBarMoveArr.splice(i,1);
			}
		}
	};

	 /**
	  * Move the identified menu to first position within 
	  * it's parents' (menu or menubar) children array.
	  */
	this.moveMenuById = function(menuId) {
		var menu = this.findMenuById (menuId);
		var parentMenu = this.getParentMenu(menu);
		if(null!==parentMenu) {
			var childArr = parentMenu.children;
			this.moveMenuToFront(menuId,childArr);
		} else {
			//menubar children
			var childArr = this.menubarModel.children;
			this.moveMenuToFront(menuId,childArr);
		}
	};
	
	/**
	  * Move the identified menu from its current position to 
	  * the end of the array.
	  */
	this.moveMenuToFront = function(menuId, childArr) {
		var startPos = (childArr.length - 1);
		for (var i = 0;i < childArr.length;i++) {
			if(menuId === childArr[i].menuId) {
				var menuBarMove = new MenuBarMove(menuId,i,0);
				this.doMenuBarMove(menuBarMove,childArr);
			}
		}
	};
	this.doMenuBarMove = function(menuBarMove,childArr) {
		if(menuBarMove instanceof MenuBarMove) {
			var menuId = menuBarMove.menuId;
			var fromPos = menuBarMove.oldPos;
			var toPos = menuBarMove.newPos;
			var childmenu = childArr.splice(fromPos,1);
			childArr.splice(toPos,0,childmenu[0]);
			this.addMenuBarMove(menuBarMove);
		}
	};
	this.undoMenuBarMove = function(menuBarMove) {
		if(menuBarMove instanceof MenuBarMove) {
			var menuId = menuBarMove.menuId;
			var fromPos = menuBarMove.oldPos;
			var toPos = menuBarMove.newPos;
			var menu = this.findMenuById (menuId);
			var parentMenu = this.getParentMenu(menu);
			var childArr = null;
			if(null!==parentMenu) {
				childArr = parentMenu.children;
			} else {
				childArr = this.menubarModel.children;
			}
			var childmenu = childArr.splice(toPos,1);
			childArr.splice(fromPos,0,childmenu[0]);
			this.deleteMenuBarMove(menuBarMove);
		}
	};
	this.getParentMenu = function(menu) {
		var parentMenu = null;
		if(null !== menu) {
			if(null!==menu.parentMenuId) {
				parentMenu = this.findMenuById (menu.parentMenuId);
			}
		}
		return parentMenu;
	};
	/**
	 * Saves the current MenuBarOptions for the current MenuBar 
	 * into a cookie.
	 */
	this.saveMenuBarOptions = function() {
		var  menubarCookie = this.loadMenuBarCookie();
		if(null===menubarCookie) {
			menubarCookie = new Object();   //a simple 'dictionary' object
		}
		menubarCookie[this.menubarModel.name] = this.menubarModel.options;
		var menuBarCookieJSON = ObjectToJSON(menubarCookie);
		setCookie('menubarPro',menuBarCookieJSON,64);
	};
	/**
	 * Loads and Applies the MenuBarOptions for the current MenuBar 
	 * from a cookie.
	 */
	this.loadMenuBarOptions = function () {
		var menubarCookie = this.loadMenuBarCookie();
		 if(null!==menubarCookie ) {
			var hiddenMenuIds = menubarCookie[this.menubarModel.name].hiddenMenuIds;
			if(hiddenMenuIds instanceof Array && hiddenMenuIds.length > 0) {
				for (var i = 0;i < hiddenMenuIds.length;i++) {
					this.hideMenuById(hiddenMenuIds[i]);
				}
			}
			var menuBarMoves = menubarCookie[this.menubarModel.name].menuBarMoves;
			if(menuBarMoves instanceof Array && menuBarMoves.length > 0) {
				for (var i = 0;i < menuBarMoves.length;i++) {
					this.moveMenuById(menuBarMoves[i].menuId);
				}
			}
			if(null!==menubarCookie[this.menubarModel.name].startingMenuId){
				this.expandMenuById(menubarCookie[this.menubarModel.name].startingMenuId); 
			}
		 }
	};
	//UNDO any MenuBarOptions currently in the model
	this.undoMenuBarOptions = function() {		
		var hiddenMenuIds = this.menubarModel.options.hiddenMenuIds;
		if(hiddenMenuIds instanceof Array && hiddenMenuIds.length > 0) {
			var startPos = hiddenMenuIds.length - 1;
			for (var i = startPos;i > -1;i--) {
				this.showMenuById(hiddenMenuIds[i]);
			}
		}
		var menuBarMoves = this.menubarModel.options.menuBarMoves;
		if(menuBarMoves instanceof Array && menuBarMoves.length > 0) {
			var startPos = (menuBarMoves.length - 1);
			for (var i = startPos;i > -1;i--) {
				this.undoMenuBarMove(menuBarMoves[i]);
			}
		}

	};
	this.resetMenuBarOptions = function(){
		this.menubarModel.options.hiddenMenuIds.length = 0;
		this.menubarModel.options.menuBarMoves.length = 0;
		this.menubarModel.options.startingMenuId = null;
	};
	//return the 'dictionary' of menubar options
	this.loadMenuBarCookie = function() {
		var menubarCookie = null;
		var menubarCookieJSON = getCookie('menubarPro');
		if(null!==menubarCookieJSON) {
			 menubarCookie = JSONToObject(menubarCookieJSON);
		}
		return  menubarCookie;
	};
};

/**
 * MENUBAR HTML Renderer functions follow.
 * Renders a MenuBar object as a nested 'tree' of divs and spans.
 * This renderer was designed for IE7 & 8 in Quirks mode.
 */
function MenuBarHTMLRenderer(menubarModel,divId) {
	this.menubarModel = menubarModel;
	this.divId = divId;  //id of div to render into

	this.setMenuBarModel = function(newMenuBarModel) {
		this.menubarModel = newMenuBarModel;
	};
	this.display = function() {
		var menuDiv = document.getElementById(this.divId);
		menuDiv.innerHTML = '';
		menuDiv.innerHTML = this.render();
		var collapseDiv = document.getElementById('collapseDiv');
		if(collapseDiv === null) { 
			this.buildCollapseDiv(menuDiv);
		}
		var fixedDiv = document.getElementById('fixedDiv');
		if(fixedDiv === null) { 
			this.buildFixedDiv(menuDiv);
		}
		var busyDiv = document.getElementById('menubarBusyDiv');
		if(busyDiv === null) { 
			this.buildBusyDiv(menuDiv);
		}
		var contextDiv = document.getElementById('menuBarContextMenuDiv');
		if(contextDiv === null) {
			this.buildContextMenuDiv(menuDiv);
		}
	};
	this.buildCollapseDiv = function(menuDiv) {
		//var menuDiv = document.getElementById("menubar");
		var collapseElem = document.createElement('a');
		collapseElem.id = 'collapseDiv';
		collapseElem.title = 'Click to collapse or expand the menubar.';
		
		if(this.menubarModel.collapsed) {
			collapseElem.onclick =  function() { MENUBAR.renderer.show(this);};
			collapseElem.className = 'ui-icon plus dashedBorder';
		} else {
			collapseElem.onclick =  function() { MENUBAR.renderer.hide(this);};
			collapseElem.className = 'ui-icon minus dashedBorder';
		}
		menuDiv.parentNode.insertBefore(collapseElem, menuDiv.nextSibling);
	};
	this.hide = function(collapseElem) {
		MENUBAR.controller.collapseMenuBar();
		var menuDiv = document.getElementById(this.divId);
		menuDiv.style.display = 'none';
		collapseElem.onclick =  function() { MENUBAR.renderer.show(this);};
		collapseElem.title = 'Click to expand MenuBar.';
		collapseElem.className = 'ui-icon plus dashedBorder';
	};
	this.show = function(collapseElem) {
		MENUBAR.controller.expandMenuBar();
		var menuDiv = document.getElementById(this.divId);
		menuDiv.style.display = 'block';
		collapseElem.onclick =  function() { MENUBAR.renderer.hide(this);};
		collapseElem.title = 'Click to collapse MenuBar.';
		collapseElem.className = 'ui-icon minus dashedBorder';
	};
	//Fixed (f) or Floating (F)
	this.buildFixedDiv = function(menuDiv) {
		var fixedElem = document.createElement('a');
		fixedElem.id = 'fixedDiv';
		fixedElem.title = 'Click to fix or float the menubar.';
		
		if(this.menubarModel.fixed) {
			fixedElem.onclick =  function() { MENUBAR.renderer.unfixMenuBar(this);};
			fixedElem.className = 'ui-icon lock dashedBorder';
		} else {
			fixedElem.onclick =  function() { MENUBAR.renderer.fixMenuBar(this);};
			fixedElem.className = 'ui-icon unlock dashedBorder';
		}
		menuDiv.parentNode.insertBefore(fixedElem, menuDiv.nextSibling);
	};
	this.fixMenuBar = function(fixedElem){
		MENUBAR.controller.fixMenuBar();
		fixedElem.onclick =  function() { MENUBAR.renderer.unfixMenuBar(this);};
		fixedElem.title = 'MenuBar is locked.';
		fixedElem.className = 'ui-icon lock dashedBorder';
		MENUBAR.display();
	};
	this.unfixMenuBar = function(fixedElem){
		MENUBAR.controller.unfixMenuBar();
		fixedElem.onclick =  function() { MENUBAR.renderer.fixMenuBar(this);};
		fixedElem.title = 'MenuBar is unlocked.';
		fixedElem.className = 'ui-icon unlock dashedBorder';
		MENUBAR.display();
	};
	this.buildBusyDiv = function(menuDiv) {
		//var menuDiv = document.getElementById("menubar");
		var ellipsisElem = document.createElement('div');
		ellipsisElem.id = 'menubarBusyDiv';
		ellipsisElem.className = 'menubarbusy';
		menuDiv.parentNode.insertBefore(ellipsisElem, menuDiv.nextSibling);
	};
	//Dynamically builds the context menu DIV so the user doesn't have to!
	this.buildContextMenuDiv = function(menuDiv) {
		var menuBarContextMenuDiv = document.createElement('div');
		menuBarContextMenuDiv.id = 'menuBarContextMenuDiv';
		menuBarContextMenuDiv.className = 'contextmenudiv';
		var menuBarContextMenuList = document.createElement('ul');
		menuBarContextMenuList.className = 'contextmenu';
		//1.hide a menu by id
		var menuBarContextMenuItem1 = document.createElement('li');
		var menuBarContextMenuAnchor1 = document.createElement('a');
		menuBarContextMenuAnchor1.id = 'hideMenuLink';
		menuBarContextMenuAnchor1.href = '#';
		menuBarContextMenuAnchor1.onclick = function() {
			MENUBAR.hideMenu(MENUBAR.getContextTargetId());
			MENUBAR.closeContextMenu();
		};
		var  menuBarContextMenuText1 = document.createTextNode("Hide this Menu");
		menuBarContextMenuAnchor1.appendChild(menuBarContextMenuText1);
		menuBarContextMenuItem1.appendChild(menuBarContextMenuAnchor1);
		menuBarContextMenuList.appendChild(menuBarContextMenuItem1);
		//2.show all menus
		var menuBarContextMenuItem2 = document.createElement('li');
		var menuBarContextMenuAnchor2 = document.createElement('a');
		menuBarContextMenuAnchor2.id = 'showAllMenuLink';
		menuBarContextMenuAnchor2.href = '#';
		menuBarContextMenuAnchor2.onclick = function() {
			MENUBAR.showAllMenus(MENUBAR.getContextTargetId());
			MENUBAR.closeContextMenu();
		};
		var  menuBarContextMenuText2 = document.createTextNode("Show all Menus");
		menuBarContextMenuAnchor2.appendChild(menuBarContextMenuText2);
		menuBarContextMenuItem2.appendChild(menuBarContextMenuAnchor2);
		menuBarContextMenuList.appendChild(menuBarContextMenuItem2);
		//3.move a menu
		var menuBarContextMenuItem3 = document.createElement('li');
		var menuBarContextMenuAnchor3 = document.createElement('a');
		menuBarContextMenuAnchor3.id = 'moveMenuLink';
		menuBarContextMenuAnchor3.href = '#';
		menuBarContextMenuAnchor3.onclick = function() {
			MENUBAR.moveMenu(MENUBAR.getContextTargetId());
			MENUBAR.closeContextMenu();
		};
		var  menuBarContextMenuText3 = document.createTextNode("Move this Menu");
		menuBarContextMenuAnchor3.appendChild(menuBarContextMenuText3);
		menuBarContextMenuItem3.appendChild(menuBarContextMenuAnchor3);
		menuBarContextMenuList.appendChild(menuBarContextMenuItem3);
		//4.save menubar options
		var menuBarContextMenuItem4 = document.createElement('li');
		menuBarContextMenuItem4.className = 'topSep';
		var menuBarContextMenuAnchor4 = document.createElement('a');
		menuBarContextMenuAnchor4.id = 'saveMenubarLink';
		menuBarContextMenuAnchor4.href = '#';
		menuBarContextMenuAnchor4.onclick = function() {
			MENUBAR.saveOptions(MENUBAR.getContextTargetId());
			MENUBAR.closeContextMenu();
		};
		var  menuBarContextMenuText4 = document.createTextNode("Save Menubar");
		menuBarContextMenuAnchor4.appendChild(menuBarContextMenuText4);
		menuBarContextMenuItem4.appendChild(menuBarContextMenuAnchor4);
		menuBarContextMenuList.appendChild(menuBarContextMenuItem4);
		//5.load menubar options
		var menuBarContextMenuItem5 = document.createElement('li');
		var menuBarContextMenuAnchor5 = document.createElement('a');
		menuBarContextMenuAnchor5.id = 'loadMenubarLink';
		menuBarContextMenuAnchor5.href = '#';
		menuBarContextMenuAnchor5.onclick = function() {
			MENUBAR.loadOptions(MENUBAR.getContextTargetId());
			MENUBAR.closeContextMenu();
		};
		var  menuBarContextMenuText5 = document.createTextNode("Load Menubar");
		menuBarContextMenuAnchor5.appendChild(menuBarContextMenuText5);
		menuBarContextMenuItem5.appendChild(menuBarContextMenuAnchor5);
		menuBarContextMenuList.appendChild(menuBarContextMenuItem5);
		//6.reset menubar options
		var menuBarContextMenuItem6 = document.createElement('li');
		var menuBarContextMenuAnchor6 = document.createElement('a');
		menuBarContextMenuAnchor6.id = 'resetMenubarLink';
		menuBarContextMenuAnchor6.href = '#';
		menuBarContextMenuAnchor6.onclick = function() {
			MENUBAR.resetOptions(MENUBAR.getContextTargetId());
			MENUBAR.closeContextMenu();
		};
		var  menuBarContextMenuText6 = document.createTextNode("Reset Menubar");
		menuBarContextMenuAnchor6.appendChild(menuBarContextMenuText6);
		menuBarContextMenuItem6.appendChild(menuBarContextMenuAnchor6);
		menuBarContextMenuList.appendChild(menuBarContextMenuItem6);
		
		menuBarContextMenuDiv.appendChild(menuBarContextMenuList);
		menuDiv.parentNode.insertBefore(menuBarContextMenuDiv, menuDiv.nextSibling);
	}
	/**
	 * For each Menu or MenuItem on the MenuBar ...
	 */
	 this.render = function() { 
		var myString =  '<div id="menubar" class="menubar level0'; 
		if(this.menubarModel.fixed ) {
			myString += ' fixed';
		}
		myString += '"';
		myString +=  ' style="display:block;"'; 
		myString +=  '>'; 
		var seq = 0;
		for (var i = 0;i < this.menubarModel.children.length;i++) {
			var menu = this.menubarModel.children[i];
			if (menu.visible ){
				menu.sequenceNumber = seq++;
				//careful here a MoreMenu is also a Menu!
				if(menu.isMoreMenu){
					myString += this.renderMoreMenu(menu);
				} else
				if(menu.isMenu){
					myString += this.renderMenu(menu);
				} else 
				if(menu.isMenuItem){
					myString += this.renderMenuItem(menu);
				} 
				
			}
		}
		myString +=  '</div>';

		return  myString;
	};
	
	this.renderMenu = function(menu){
		var myString =  '<span';
		myString += ' id="'+menu.menuId+'"';
		myString += ' class="menu';
		if(menu.selected) {
			myString += ' selected';
		}
		if(menu.sequenceNumber === 0){
			myString += ' firstMenu';
		}
		if(this.menubarModel.disabled){
			myString += ' disabled';
		}
		myString +=  '"';
		if(null!==menu.width){
			myString += ' style="width:'+menu.width+';';
		}
		if(this.menubarModel.disabled){
			myString += 'cursor:default;';
		}
		myString += '"';
		if(!this.menubarModel.disabled){
			myString +=  ' onclick="MENUBAR.controller.handleMenuClick(\''+menu.menuId+'\');"';
		}
		myString +=  '>';
		myString += menu.text;
		myString +='</span>';
		//If I am selected then render my children
		if(menu.selected) {
			myString +=  '<div'; 
			myString +=  ' class="';
			if(menu.level===0) {
				myString += 'menulist level1';
			} else 
			if(menu.level===1) {
				myString += 'menulist level2';
			} else 
			if(menu.level===2) {
				myString += 'menulist level3';
			} else 
			if(menu.level===3) {
				myString += 'menulist level4';
			} else {
				myString += 'menulist level5';
			} 
			myString += '"';
			myString +='>';
			var seq = 0; 
			for (var i = 0;i < menu.children.length;i++) {
				var childmenu = menu.children[i];
				if (childmenu.visible ){ 
					childmenu.sequenceNumber = seq++;
					//check for MoreMenu before Menu - instanceof doesn't always work here?!
					if(childmenu.isMoreMenu){
						myString += this.renderMoreMenu(childmenu);
					} else
					if(childmenu.isMenu){
						myString += this.renderMenu(childmenu);
					} else 
					if(childmenu.isMenuItem){
						myString += this.renderMenuItem(childmenu);
					} 	
				}					
			}
			myString +=  '</div>';
		}

		return  myString;
		
	};
	
	this.renderMoreMenu = function(moremenu) {
		var myString =  '<span';
		myString += ' id="'+moremenu.menuId+'"';
		myString += ' class="moremenu';
		if(moremenu.selected) {
			myString += ' selected';
		}
		if(moremenu.sequenceNumber === 0){
			myString += ' firstMenu';
		}
		if(this.menubarModel.disabled){
			myString += ' disabled';
		}
		myString +=  '"';
		if(null!==moremenu.width){
			myString += ' style="width:'+moremenu.width+';';
		}
		if(this.menubarModel.disabled){
			myString += 'cursor:default;';
		}
		myString +=  '"';
		if(!this.menubarModel.disabled){
			myString +=  ' onclick="MENUBAR.controller.handleMoreMenuClick(\''+moremenu.menuId+'\');"';
		}
		myString +=  '>';
		myString += moremenu.text;
		//If I am selected then render my children
		if(moremenu.selected) {
			myString +=  '<ul'; 
			myString +=  ' class="';
			if(moremenu.level===1) {
				myString += 'moremenulist level1';
			} else 
			if(moremenu.level===2) {
				myString += 'moremenulist level2';
			} else 
			if(moremenu.level===3) {
				myString += 'moremenulist level3';
			} else {
				myString += 'moremenulist level4';
			} 
			myString += '"';
			myString +='>';
			for (var i = 0;i < moremenu.children.length;i++) {
				myString += this.renderMenuItem(moremenu.children[i]);
			}
			myString +=  '</ul>';
		}
		myString +='</span>';
		return  myString;
	};
	/**
	 * For a MenuItem: 
	 * The Menu 'id' is on the span element. 
	 * The Menu id +'_Anchor' is on the anchor tag 
	 * so that it can be found and 'clicked' from code.
	 */
	this.renderMenuItem = function(menuitem){
		var myString =  '<span class="menuitem'; 		
		if (menuitem.selected ){
			myString += ' selected';
		}
		if(menuitem.sequenceNumber === 0){
			myString += ' firstMenu';
		}
		if(this.menubarModel.disabled){
			myString += ' disabled';
		}
		myString += '"';
		myString += ' id="'+menuitem.menuId+'"';  
		if(!this.menubarModel.disabled){
			if(null!==menuitem.onclickFunction){
				myString += ' onclick="'+menuitem.onclickFunction+'"';
			}
			if(null!==menuitem.linkURL){
				myString += ' onclick="window.location=\''+menuitem.linkURL+'\'"';
			}
			myString += ' onmouseover="this.className+=\' mouseover\';"';
			myString += ' onmouseout="this.className=this.className.replace(/\\bmouseover/g,\'\');"';
		}
		
		myString += ' style="';
		if(null!==menuitem.width){
			myString += 'width:'+menuitem.width+';';
		}			
		if(this.menubarModel.disabled){
			myString += 'cursor:default;';
		}
		myString +='">';
			
		myString +=  menuitem.text;
		myString +=  '</span>';
		return  myString;
	};		
};
