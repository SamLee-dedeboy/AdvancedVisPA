

class CheckBox extends Widget 
{
	constructor( parent, labelText ) {
		
		super( "CheckBox", parent, 0, 0, labelText.length * 7 + 60, 30 );

		this.setHasBorder( true );
		this.checked = true;

		var c = document.querySelector( this.getSelector() );

		var label = document.createElement( 'label' );
		label.innerHTML = labelText;
		label.style.position = 'absolute';
		label.style.top  = '6px';
		label.style.right = '35px';
		label.style.left = '6px';
		label.style.color = 'rgba( 0,0,0,0.5 )';
		label.style[ 'white-space' ] = 'nowrap';
		label.style.textAlign = 'center'
		c.append( label );
		

		this.box       = new Widget( "cBox", this.getSelector(), this.getSize().x - 32, 5, 20, 20 );//.setBkgColor( 255, 255, 255 );
		this.boxE = document.querySelector( this.box.getSelector() );	

		var boxE = this.boxE;
	
		boxE.style[ 'box-shadow' ] = "inset 1px 1px 6px -6px, inset 1px 1px 6px -6px";
		boxE.style[ 'background' ] = "rgb(255, 255, 255)";		
		boxE.style[ 'border-radius' ] = '50%';
		boxE.style[ 'padding-left' ] = '5px';
        boxE.innerHTML = '\u2714';
        boxE.style.cursor = 'pointer';
        boxE.style.color = "rgb( 120, 120, 120 )";
		
		var self = this;
		boxE.addEventListener( 'mouseup', function( e ) {
			e.preventDefault();
			self.checked = ! self.checked;
			if( self.checked )
			{
                boxE.innerHTML = '\u2714';
			}
			else
			{					
                boxE.innerHTML = '';
			}
			c.dispatchEvent( new Event( "changed" ) );

		}, false );	

		return this;
	}

	isChecked()
	{ 
		return this.checked;
	}
	setChecked(checked) {
		this.checked = checked;
		var boxE = this.boxE
		if( this.checked )
			{
                boxE.innerHTML = '\u2714';
			}
			else
			{					
                boxE.innerHTML = '';
			}
		document.querySelector( this.getSelector() ).dispatchEvent( new Event( "changed" ) );
	}
    setTransparency( a )
    {
        this.boxE.style[ "background-color" ] = "rgba(255,255,255," + a + ")";
        return this;
    }

    setColor( cssColor )
    {
        this.boxE.style.color = cssColor;
        return this;
    }
}