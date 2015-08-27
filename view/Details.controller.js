jQuery.sap.declare("test05.view.Details");
jQuery.sap.require("sap.ca.ui.model.type.Date");
jQuery.sap.require("sap.ui.core.mvc.Controller");
jQuery.sap.require("sap.ca.ui.model.format.AmountFormat");
jQuery.sap.require("test05.view.Formatter");
jQuery.sap.require("sap.m.MessageBox");

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
	_onConfirmClicked: false,
	_ws: null,

	onInit: function() {
		this._oView = this.getView();
		this._oComponent = sap.ui.component(sap.ui.core.Component.getOwnerIdFor(this._oView));
		this._oRouter = this._oComponent.getRouter();
		this._oRouter.attachRoutePatternMatched(this._onRoutePatternMatched, this);
		this._oDialog = this.getView().byId("BusyDialog");
		this._oModel = this.getView().getModel();
		this.clearAllInputs();
		this.initWebSocket();
	},

	initWebSocket: function() {
		if (this._ws !== null) {
			return;
		}
		var self = this;
		var wsUri = "ws://" + window.location.host + "/sap/bc/apc/sap/ztest/";
		this._ws = new WebSocket(wsUri);

		this._ws.onopen = function(evt) {
			self.onOpen(evt);
		};
		this._ws.onclose = function(evt) {
			self.onClose(evt);
		};
		this._ws.onmessage = function(evt) {
			self.onMessage(evt);
		};
		this._ws.onerror = function(err) {
			sap.m.MessageToast.show("Error: WebSocket Not Connected");
		};
	},

	onOpen: function(evt) {
		var device = this.getView().byId("deviceId").getValue();
		this._ws.send(device);
		console.log("WebSocket Opened");
	},

	onMessage: function(evt) {
		if (evt.data === "YES") {
			//Call Table Refresh
			console.log("Reveived Data: " + evt.data);
			this.lookupTags();
		}
	},

	onClose: function() {
		this._ws = null;
		console.log("WebSocket Closed");
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

	onClearTags: function() {
		this.showWarning();
	},

	removeTags: function() {
		var me = this;
		var oModel = this.getView().getModel();
		var device = this.getView().byId("deviceId").getValue();
		oModel.remove("/TempTagUIDSet(DevId='" + device + "')", {
			success: function() {
				me.lookupTags();
			}
		});
	},

	showWarning: function() {
		var me = this;
		var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;

		sap.m.MessageBox.show("Do you want to continue?", {
			icon: sap.m.MessageBox.Icon.INFORMATION,
			title: "Warning",
			actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
			id: "messageBoxId1",
			defaultAction: sap.m.MessageBox.Action.NO,
			initialFocus: sap.m.MessageBox.Action.YES,
			styleClass: bCompact ? "sapUiSizeCompact" : "",
			onClose: function(oAction) {
				if (oAction === sap.m.MessageBox.Action.YES) {
					me.removeTags();
				}
			}
		});
	},

	onConfirm: function() {

		var me = this;
		var oModel = this.getView().getModel();
		var oDialog = this.getView().byId("BusyDialog");
		var device = this.getView().byId("deviceId").getValue();
		var delivery = this.getView().byId("deliveryInput").getValue();
		var equipment = this.getView().byId("equipmentInput").getValue();

		var oEntry = {};

		oEntry.Equnr = equipment;
		oEntry.Vbeln = delivery;
		oEntry.DevId = device;

		oDialog.open();

		oModel.create("/DispatchSet", oEntry, {
			success: function(data) {
				oDialog.close();
				var oInput = {};
				oInput.title = 'Scan Result';
				oInput.text = data.Message;
				if (data.Type === "E" || data.Type === " ") {
					oInput.state = 'Error';
				} else if (data.Type === "S") {
					oInput.state = 'Success';
					me.sendAsn(oEntry);
					me.clearAllInputs();
					me.clearTable();
				}
				me.showSuccessDialog(oInput);
			},
			error: function(error) {
				oDialog.close();
				sap.m.MessageToast.show("Error");
			}
		});
	},

	sendAsn: function(oEntry) {
		var me = this;
		var oInput = {};

		oInput.Equnr = oEntry.Equnr;
		oInput.Vbeln = oEntry.Vbeln;
		var oModel = this.getView().getModel();
		oModel.create("/AsnSet", oInput, {
			success: function(data) {
				if (data.Type === "S") {
					sap.m.MessageToast.show("ASN Sent");
				} else if (data.Type === "E") {
					sap.m.MessageToast.show("ASN Failed");
				}
			},
			error: function(error) {
				sap.m.MessageToast.show("Error Sending ASN");
			}
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

		oDialog.open();

		oModel.read("/DispatchSet(Equnr='" + equipment + "',Vbeln='" + delivery + "',Posnr='',TagUid='')", {
			success: function(d) {
				oDialog.close();
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
					me.setTableBinding();
				}
			},
			error: function(error) {
				oDialog.close();
			}
		});
		/*
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
			var d = oModel.getProperty("/DispatchSet(TagUid='',Equnr='',Vbeln='',Posnr='000000')");
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
			//oModel.setRefreshAfterChange();
			oModel.mEventRegistry.requestCompleted = [];
			oModel.mEventRegistry.requestFailed = [];
			//oEvent.preventDefault();
		});
		oModel.attachRequestFailed(function() {
			oDialog.close();
			oModel.mEventRegistry.requestFailed = [];
		});
		*/
	},

	clearInputState: function() {
		this.byId("deliveryInput").setValueState("None");
		this.byId("deliveryInput").setValueStateText("");
		this.byId("equipmentInput").setValueState("None");
		this.byId("equipmentInput").setValueStateText("");
	},

	setTableBinding: function() {
		this.lookupTags();
	},

	lookupTags: function() {
		this.checkAndUpdateTag();
		/*
		this._tagLookup = setInterval(function() {
			me.checkAndUpdateTag(me);
			if (me._clearIntervalFlag === "X") {
				clearInterval(me._tagLookup);
				console.log("ClearInterval_Main");
			}
			//clearInterval(this._tagLookup);
		}, 500);
		*/
	},

	checkAndUpdateTag: function() {
		var meThis = this;
		var device = this.getView().byId("deviceId").getValue();
		var delivery = this.getView().byId("deliveryInput").getValue();
		var equipment = this.getView().byId("equipmentInput").getValue();
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
		oModel.read("/DispatchSet", {
			filters: filters,
			success: function(jsonStr) {
				var results = null;
				if (jsonStr.results != null) {
					results = jsonStr.results;
				}
				if (results == null) {
					return;
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
			},
			error: function() {

			}
		});
		
		oModel.attachRequestSent(function() {
			oModel.mEventRegistry.requestSent = [];
		});
		*/
		oModel.attachRequestCompleted(function(oEvent) {
			var resp = oEvent.getParameter("response");
			var rText = resp.responseText.replace(/[^{]*/i, "");
			var t = rText.split("--");
			var pt = t[0];
			if (pt === "" || pt === null) {
				return;
			}
			var jsonStr = JSON.parse(pt);
			if (jsonStr.d.results) {
				var results = jsonStr.d.results;
			} else {
				return;
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
				//meThis.setEnableConfirm(true);
				var oInput = {};
				oInput.title = "Scan Successful";
				oInput.state = "Success";
				oInput.text = "Proceed to Confirm!";
				meThis.showSuccessDialog(oInput);
			}
			oModel.mEventRegistry.requestCompleted = [];
			oModel.mEventRegistry.requestFailed = [];
		});
		oModel.attachRequestFailed(function(error) {
			sap.m.MessageToast.show(error);
			oModel.mEventRegistry.requestFailed = [];
		});
	},

	setEnableConfirm: function(bval) {
		this.getView().byId("buttonConfirm").setEnabled(bval);
	},

	showSuccessDialog: function(oInput) {
		var dialog = new sap.m.Dialog({
			title: oInput.title, //'Scan Successful',
			type: "Message",
			state: oInput.state, //'Success',
			content: new sap.m.Text({
				text: oInput.text //'Proceed to Confirm!'
			}),
			beginButton: new sap.m.Button({
				text: "OK",
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
			if (dialog.isActive()) {
				dialog.close();
			}
		}, 3000);
		//this.getView().byId("buttonConfirm").setValueState("Success");
		//this.getView().byId("buttonConfirm").focus();
	},
	getAllInput: function() {
		this._equipmentInput = this.getView().byId("equipmentInput").getValue();
		this._deliveryInput = this.getView().byId("deliveryInput").getValue();
		this._deviceId = this.getView().byId("deviceId").getValue();
	},

	clearAllInputs: function() {
		this.getView().byId("deliveryInput").setValue("");
		this.getView().byId("equipmentInput").setValue("");
		this.getView().byId("equipmentInput").focus();
		this._equipmentInput = "";
		this._deliveryInput = "";
		this._tagIdInput = "";
		this._deviceId = "";
		this.getView().byId("equipmentInput").setValueState("None");
		this.getView().byId("deliveryInput").setValueStateText("");
		this.getView().byId("deliveryInput").focus();
	},
	
	clearTable: function() {
		this.setTableBinding();
	},

	onDetailPress: function(oEvent) {
		var oModel = this.getView().getModel();
		var selectedPath = oEvent.getSource().getBindingContext().getPath();
		var selectedData = oModel.getProperty(selectedPath);

		var delivery = selectedData.Vbeln;
		var equipment = selectedData.Equnr;
		var delItem = selectedData.Posnr;
		var device = this.getView().byId("deviceId").getValue();

		var oFilter1 = new sap.ui.model.Filter("Vbeln", sap.ui.model.FilterOperator.EQ, delivery);
		var oFilter2 = new sap.ui.model.Filter("Posnr", sap.ui.model.FilterOperator.EQ, delItem);
		var oFilter3 = new sap.ui.model.Filter("Equnr", sap.ui.model.FilterOperator.EQ, equipment);
		var oFilter4 = new sap.ui.model.Filter("DevId", sap.ui.model.FilterOperator.EQ, device);
		var filters = [oFilter1, oFilter2, oFilter3, oFilter4];

		var dialog = new sap.m.Dialog({
			title: "Scan Status",
			content: new sap.m.List("detailDialog", {
				items: {
					path: "/DispatchSet",
					template: new sap.m.StandardListItem({
						title: "{Matnr}",
						description: "{Maktx}",
						info: "{Charg}",
						//infoState: "{ path: 'Type', formatter: 'myFormatter.getState' }",
						icon: "{ path: 'Type', formatter: 'myFormatter.getIcon' }"
					}),
					filters: filters,
					sorter: "Type"
				}
			}),
			beginButton: new sap.m.Button({
				text: "Close",
				press: function() {
					dialog.close();
				}
			}),
			afterClose: function() {
				dialog.destroy();
			}
		});
		//to get access to the global model
		this.getView().addDependent(dialog);
		dialog.open();
		/*
		oModel.attachRequestSent(function() {
			oModel.mEventRegistry.requestSent = [];
		});
		oModel.attachRequestCompleted(function() {
			oModel.mEventRegistry.requestCompleted = [];
		});
		*/
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
		this.clearAllInputs();
		window.history.go(-2);
	}
});