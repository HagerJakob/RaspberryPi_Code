export namespace main {
	
	export class OBDData {
	    RPM: string;
	    SPEED: string;
	    COOLANT: string;
	    OIL: string;
	    FUEL: string;
	    VOLTAGE: string;
	    BOOST: string;
	    OILPRESS: string;
	    UART_CONNECTED: boolean;
	    TIME: string;
	
	    static createFrom(source: any = {}) {
	        return new OBDData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.RPM = source["RPM"];
	        this.SPEED = source["SPEED"];
	        this.COOLANT = source["COOLANT"];
	        this.OIL = source["OIL"];
	        this.FUEL = source["FUEL"];
	        this.VOLTAGE = source["VOLTAGE"];
	        this.BOOST = source["BOOST"];
	        this.OILPRESS = source["OILPRESS"];
	        this.UART_CONNECTED = source["UART_CONNECTED"];
	        this.TIME = source["TIME"];
	    }
	}

}

