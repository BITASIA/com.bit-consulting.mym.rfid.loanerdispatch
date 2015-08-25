jQuery.sap.declare("test05.view.Formatter");

var myFormatter = {
	getIcon: function(fval) {
		var icon = "status-error";
		if (fval === "" || fval === "E") {
			icon = "status-error";
		} else if (fval === "S") {
			icon = "status-completed";
		} else if (fval === "W" || fval === "I") {
			icon = "status-warning";
		} else if (fval === "X") {
			icon = "decline";
		}
		//return "sap-icon://" + icon;
		return 'images/' + icon + '.png';
	},
	getState: function(fval) {
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
	}
};