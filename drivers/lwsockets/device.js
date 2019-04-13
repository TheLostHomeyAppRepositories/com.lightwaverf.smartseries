'use strict';

const Homey = require( 'homey' );
const LightwaveSmartBridge = require( '../../lib/LightwaveSmartBridge' );

module.exports = class lwsockets extends Homey.Device
{
    async onInit()
    {
        try
        {
            this.log( 'Device init( Name:', this.getName(), ', Class:', this.getClass() + ")" );

            if ( await Homey.app.getBridge().waitForBridgeReady() )
            {
                this.initDevice();
            }
        }
        catch ( err )
        {
            this.log( "lwsockets Device OnInit Error ", err );
        }
        // register a capability listener
        this.registerCapabilityListener( 'onoff', this.onCapabilityOnoff.bind( this ) );
    }

    initDevice()
    {
        this.log( this.getName(), ': Getting Values' );
        this.getDeviceValues();
        this.registerWebhook();

    }

    // this method is called when the Homey device has requested a state change (turned on or off)
    async onCapabilityOnoff( value, opts )
    {
        var result = "";

        try
        {
            // Get the device information stored during pairing
            const devData = this.getData();

            // The device requires '0' for off and '1' for on
            var data = '0';
            if ( value )
            {
                data = '1';
            }

            // this.log('Switching ', devData['switch'], " to ", data);

            // Set the switch Value on the device using the unique feature ID stored during pairing
            result = await Homey.app.getBridge().setFeatureValue( devData[ 'switch' ], data );
            if ( result == -1 )
            {
                this.setUnavailable();
            }
            else
            {
                this.setAvailable();
            }
        }
        catch ( err )
        {
            this.setUnavailable();
            this.log( "lwsockets Device onCapabilityOnoff Error ", err );
        }
    }

    async registerWebhook()
    {
        try
        {
            let driverId = this.getDriver().id;
            let data = this.getData();
            let id = driverId + "_" + data.id;

            this.log( this.getName(), ': Registering LW WebHooks', data.switch, id );

            await Promise.all( [ Homey.app.getBridge().registerWEBHooks( data.switch, 'feature', id + '_switch' ),
                Homey.app.getBridge().registerWEBHooks( data.power, 'feature', id + '_power' ),
                Homey.app.getBridge().registerWEBHooks( data.energy, 'feature', id + '_energy' )
            ] );
        }
        catch ( err )
        {
            this.log( "Failed to create webhooks", err );
        }
    }

    async setWebHookValue( capability, value )
    {
        try
        {
            if ( capability == "switch" )
            {
                await this.setCapabilityValue( 'onoff', ( value == 1 ) );
                this.setAvailable();
            }
            else if ( capability == "power" )
            {
                await this.setCapabilityValue( 'measure_power', value );
                this.setAvailable();
            }
            else if ( capability == "energy" )
            {
                await this.setCapabilityValue( 'meter_power', value / 1000 );
                this.setAvailable();
            }
        }
        catch ( err )
        {

        }
    }

    async getDeviceValues()
    {
        try
        {
            const devData = this.getData();
            //console.log( devData );

            // Get the current switch Value from the device using the unique feature ID stored during pairing
            const onoff = await Homey.app.getBridge().getFeatureValue( devData[ 'switch' ] );
            switch ( onoff )
            {
                case 0:
                    // Device returns 0 for off and 1 for on so convert o false and true
                    this.setAvailable();
                    await this.setCapabilityValue( 'onoff', false );
                    break;

                case 1:
                    this.setAvailable();
                    await this.setCapabilityValue( 'onoff', true );
                    break;

                default:
                    // Bad response so set as unavailable for now
                    this.setUnavailable();
                    break;
            }

            // Get the current power Value from the device using the unique feature ID stored during pairing
            const power = await Homey.app.getBridge().getFeatureValue( devData[ 'power' ] );
            if ( power >= 0 )
            {
                this.setAvailable();
                await this.setCapabilityValue( 'measure_power', power );
            }

            // Get the current power Value from the device using the unique feature ID stored during pairing
            const energy = await Homey.app.getBridge().getFeatureValue( devData[ 'energy' ] );
            if ( energy >= 0 )
            {
                this.setAvailable();
                await this.setCapabilityValue( 'meter_power', energy / 1000 );
            }
        }
        catch ( err )
        {
            this.setUnavailable();
            this.log( "lwsockets Device getDeviceValues Error ", err );
        }
    }

    async onDeleted() {}
}

//module.exports = MyDevice;