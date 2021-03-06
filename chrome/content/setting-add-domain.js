/*
* "The contents of this file are subject to the Mozilla Public Licenske
* Version 1.1 (the "License"); you may not use this file except in
* compliance with the License. You may obtain a copy of the License at
* http://www.mozilla.org/MPL/
* 
* Software distributed under the License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
* License for the specific language governing rights and limitations
* under the License.
* 
* The Original Code is confirm-address.
* 
* The Initial Developers of the Original Code are kentaro.matsumae and Meatian.
* Portions created by Initial Developers are 
* Copyright (C) 2007-2011 the Initial Developer.All Rights Reserved.
* 
* Contributor(s): tanabec
*/ 
var parentWindow;

function startup(){
	dump("[setting start]\n");
	parentWindow = window.arguments[0];
	
	if(parentWindow.domainName != null){
		document.getElementById("textbox").value = parentWindow.domainName;
	}
}

function doOK(){
	parentWindow.domainName = document.getElementById("textbox").value;
	dump("[input] " + parentWindow.domainName + "\n");
	parentWindow.confmail_confirmOK = true;	
	return true;
}

function doCancel(){
	dump("[cancel]\n");
	parentWindow.confmail_confirmOK = false;	
	return true;
}
