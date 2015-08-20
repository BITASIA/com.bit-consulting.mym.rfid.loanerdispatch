jQuery.sap.declare("test05.view.Details");
jQuery.sap.require("sap.ca.ui.model.type.Date");
jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("sap.ca.ui.model.format.AmountFormat");

sap.ui.core.mvc.Controller.extend("test05.view.Details", {
	_oItemTemplate: null,
	_oNavigationTable: null,
	_sItemPath: "",
	_sNavigationPath: "",
	_deviceId: "",
	_equipmentInput: "",
	_deliveryInput: "",
	_batchInput: "",
	_serialInput: "",
	_tagIdInput: "",
	_tagLookup: null,
	_clearIntervalFlag: "",
	_clearFlag: "",
	_oDialog: null,
	_oModel: null,

	onInit: function() {
		this._oView = this.getView();
		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this._oView));
		this._oRouter = this._oComponent.getRouter();
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
		this._oDialog = this.getView().byId("BusyDialog");
		this._oModel = this.getView().getModel();
		this.clearAllInputs(this);
	},

	getStatusIcon: function(fval) {
		var icon = "status-error";
		if (fval === "" || fval === "E") {
			icon = "status-error";
		} else if (fval === "S") {
			icon = "status-completed";
		} else if (fval === "W") {
			icon = "status-in-process";
		} else if (fval === "X") {
			icon = "decline";
		}
		return "sap-icon://" + icon;
	},

	getIconStatus: function(fval) {
		var state = "Error";
		if (fval === "" || fval === "E") {
			state = "Error";
		} else if (fval === "S") {
			state = "Success";
		} else if (fval === "X") {
			state = "Error";
		}
		return "E(1),S(2)";
	},

	getStatusState: function(fval) {
		var state = "Error";
		if (fval === "" || fval === "E") {
			state = "Error";
		} else if (fval === "S") {
			state = "Success";
		} else if (fval === "W") {
			state = "Warning";
		} else if (fval === "X") {
			state = "Error";
		}
		return state;
	},

	onReRead: function() {
		this.lookupTags();
		//this.checkAndUpdateTag(this);
	},

	onConfirm: function() {
		var me = this;

		clearInterval(this._tagLookup);

		var oDialog = this.getView().byId("BusyDialog");
		var device = this.getView().byId("deviceId").getValue();
		var delivery = this.getView().byId("deliveryInput").getValue();
		var equipment = this.getView().byId("equipmentInput").getValue();

		var oEntry = {};

		var oModel = this.getView().getModel();

		oEntry.Equnr = equipment;
		oEntry.Vbeln = delivery;
		oEntry.DevId = device;
		//oEntry.JsonData = JSON.stringify(oModel.oData);

		oModel.create("/DispatchSet", oEntry, null, null, null);

		oModel.attachRequestSent(function() {
			oDialog.open();
			oModel.mEventRegistry.requestSent = [];
		});

		oModel.attachRequestCompleted(function(oEvent) {
			oDialog.close();
			me._clearFlag = "X";

			oModel.mEventRegistry.requestCompleted = [];
			oModel.mEventRegistry.requestFailed = [];

			var resp = oEvent.getParameter("response");
			var rText = resp.responseText.replace(/[^{]*/i, '');
			var t = rText.split("--");
			var pt = t[0];
			var jsonStr = JSON.parse(pt);

			var oInput = {};
			oInput.title = 'Scan Successful';

			oInput.text = jsonStr.d.Message;

			if (jsonStr.d.Type === "E") {
				oInput.state = 'Error';
			} else {
			    me.clearAllInputs(me);
				oInput.state = 'Success';
			}

			me.showSuccessDialog(oInput);
		});
		oModel.attachRequestFailed(function() {
			oDialog.close();
			oModel.mEventRegistry.requestFailed = [];
		});
	},

	onEquipmentInputChange: function() {
		this._inputType = "equ";
		this.checkInput(this._inputType);
	},
	onDeliveryInputChange: function() {
		this._inputType = "del";
		this.checkInput(this._inputType);
	},

	checkInput: function() {
		this.clearInputState();
		var delivery = this.getView().byId("deliveryInput").getValue();
		var equipment = this.getView().byId("equipmentInput").getValue();
		var oDialog = this.getView().byId("BusyDialog");
		var me = this;

		var oModel = this.getView().getModel();
		//oModel.setHeaders["Content-Type"] = "application/json";
		oModel.read("/DispatchSet(Equnr='" + equipment + "',Vbeln='" + delivery + "',Posnr='')", null, null, true);

		oModel.attachRequestSent(function() {
			oDialog.open();
			oModel.mEventRegistry.requestSent = [];
		});

		oModel.attachRequestCompleted(function(oEvent) {
			oDialog.close();
			//var resp = {};
			//resp = oEvent.getParameter("response");
			//var rText = resp.responseText;
			//var jsonStr = JSON.parse(rText);
			var d = oModel.getProperty("/DispatchSet(Equnr='',Vbeln='',Posnr='000000')");
			if (d.Type) {
				var mType = d.Type;
			}
			if (d.Message) {
				var message = d.Message;
			}
			if (mType === "E") {
				oDialog.close();
				if (me._inputType === "del") {
					me.byId("deliveryInput").focus();
					me.byId("deliveryInput").setValueState("Error");
					me.byId("deliveryInput").setValueStateText(message);
				} else if (me._inputType === "equ") {
					me.byId("equipmentInput").focus();
					me.byId("equipmentInput").setValueState("Error");
					me.byId("equipmentInput").setValueStateText(message);
				}
			} else if (mType === "S") {
				me.setTableBinding("X");
			}
			oModel.mEventRegistry.requestCompleted = [];
			oModel.mEventRegistry.requestFailed = [];
			//oEvent.preventDefault();
		});
		oModel.attachRequestFailed(function() {
			oDialog.close();
			oModel.mEventRegistry.requestFailed = [];
		});
	},

	clearInputState: function() {
		this.byId("deliveryInput").setValueState("None");
		this.byId("deliveryInput").setValueStateText("");
		this.byId("equipmentInput").setValueState("None");
		this.byId("equipmentInput").setValueStateText("");
		if (this._tagLookup !== null) {
			clearInterval(this._tagLookup);
		}
	},

	setTableBinding: function(lookForTags) {
		var me = this;

		var delivery = this.getView().byId("deliveryInput").getValue();
		var equipment = this.getView().byId("equipmentInput").getValue();
		var oItemTemplate = this.byId("colListItems");
		var oTable = this.getView().byId("itemTable");

		var oFilter1 = new sap.ui.model.Filter("Vbeln", sap.ui.model.FilterOperator.EQ, delivery);
		var oFilter2 = new sap.ui.model.Filter("Equnr", sap.ui.model.FilterOperator.EQ, equipment);
		//var oFilter3 = new sap.ui.model.Filter("First", sap.ui.model.FilterOperator.EQ, "X");
		var filters = [oFilter1, oFilter2];

		oTable.bindAggregation("items", {
			path: "/DispatchSet",
			template: oItemTemplate,
			filters: filters
		});

		if (lookForTags === "X") {
			me.lookupTags();
		}
	},

	lookupTags: function() {
		var me = this;
		this._tagLookup = setInterval(function() {
			me.checkAndUpdateTag(me);
			if (me._clearIntervalFlag === "X") {
				clearInterval(me._tagLookup);
				console.log("ClearInterval_Main");
			}
			//clearInterval(this._tagLookup);
		}, 4000);
	},

	checkAndUpdateTag: function(me) {
		var meThis = this;
		var device = me.getView().byId("deviceId").getValue();
		var delivery = me.getView().byId("deliveryInput").getValue();
		var equipment = me.getView().byId("equipmentInput").getValue();
		var oTable = this.getView().byId("itemTable");

		var oFilter1 = new sap.ui.model.Filter("Vbeln", sap.ui.model.FilterOperator.EQ, delivery);
		var oFilter2 = new sap.ui.model.Filter("Equnr", sap.ui.model.FilterOperator.EQ, equipment);
		var oFilter3 = new sap.ui.model.Filter("DevId", sap.ui.model.FilterOperator.EQ, device);
		var filters = [oFilter1, oFilter2, oFilter3];

		var oModel = this.getView().getModel();
		var oItemTemplate = this.byId("colListItems");
		oTable.bindAggregation("items", {
			path: "/DispatchSet",
			template: oItemTemplate,
			filters: filters
		});
		/*
		oModel.read("/AssembleLoansetSet", {
			filters: filters
		});

		oModel.read("/AssemblyReadTagsSet", {
			filters: filters
		});
		*/
		oModel.attachRequestSent(function() {
			oModel.mEventRegistry.requestSent = [];
		});
		oModel.attachRequestCompleted(function(oEvent) {
			//sap.m.MessageToast.show("Tag Read Request Complete");
			//clearInterval(meThis._tagLookup);
			var resp = oEvent.getParameter("response");
			//var rText = resp.responseText;
			var rText = resp.responseText.replace(/[^{]*/i, '');
			var t = rText.split("--");
			var pt = t[0];
			var jsonStr = JSON.parse(pt);
			if (jsonStr.d.results) {
				var results = jsonStr.d.results;
			}
			var noErr = "X";
			meThis._clearIntervalFlag = "";
			for (var i = 0; i <= results.length; i++) {
				if (results[i]) {
					if (results[i].UidStatus === "E" ||
						results[i].UidStatus === "W" ||
						results[i].UidStatus === "") {
						noErr = "";
					}
				} else {
					break;
				}
			}
			if (noErr === "X" && results.length !== 0) {
				meThis._clearIntervalFlag = "X";
				clearInterval(meThis._tagLookup);
				var oInput = {};
				oInput.title = 'Scan Successful';
				oInput.state = 'Success';
				oInput.text = 'Proceed to Confirm!';
				meThis.showSuccessDialog(oInput);
				console.log("ClearInterval");
			}
			//oModel.setData(jsonStr);
			oModel.mEventRegistry.requestCompleted = [];
			oModel.mEventRegistry.requestFailed = [];
			//oTable.init();
		});
		oModel.attachRequestFailed(function(oEvent) {
			sap.m.MessageToast.show("Error");

			oModel.mEventRegistry.requestFailed = [];
		});

	},

	showSuccessDialog: function(oInput) {
		var dialog = new sap.m.Dialog({
			title: oInput.title, //'Scan Successful',
			type: 'Message',
			state: oInput.state, //'Success',
			content: new sap.m.Text({
				text: oInput.text //'Proceed to Confirm!'
			}),
			beginButton: new sap.m.Button({
				text: 'OK',
				press: function() {
					dialog.close();
				}
			}),
			afterClose: function() {
				dialog.destroy();
			}
		});

		dialog.open();
		setTimeout(function() {
			dialog.close();
		}, 3000);
		//this.getView().byId("buttonConfirm").setValueState("Success");
		this.getView().byId("buttonConfirm").focus();
	},
	getAllInput: function() {
		this._equipmentInput = this.getView().byId("equipmentInput").getValue();
		this._deliveryInput = this.getView().byId("deliveryInput").getValue();
		this._deviceId = this.getView().byId("deviceId").getValue();
	},

	clearAllInputs: function(me) {
		me.getView().byId("deliveryInput").setValue("");
		me.getView().byId("equipmentInput").setValue("");
		//me.getView().byId(me.getView().sId + "--tagIdInput").setValue("");
		me.getView().byId("equipmentInput").focus();
		this._equipmentInput = "";
		this._deliveryInput = "";
		this._tagIdInput = "";
		this._deviceId = "";
		this.getView().byId("equipmentInput").setValueState("None");
		this.getView().byId("deliveryInput").setValueStateText("");

		//var oTable = this.getView().byId("itemTable");
		this.setTableBinding("");
		//this.getView().byId("buttonConfirm").setValueState("None");
	},

	onIconPress: function(evt) {
		sap.m.MessageToast.show("Icon Pressed");
	},

	_onRoutePatternMatched: function(oEvent) {
		if (oEvent.getParameter("name") !== "details") {
			return;
		}

		this._sItemPath = "/" + oEvent.getParameters().arguments.entity;
		this._sNavigationPath = this._sItemPath + "/" + "";

		// Bind Object Header and Form using oData
		this.byId("DetailsPage").bindElement({
			path: this._sItemPath
		});

		// Bind Review Table using oData Reviews Entity
		//this._bindNavigationTable(this._sNavigationPath);
	},

	onNavBack: function() {
		this.clearAllInputs(this);
		window.history.go(-2);
	}
});