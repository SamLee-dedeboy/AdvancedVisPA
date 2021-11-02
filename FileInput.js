
class FileInput extends Widget
{
	constructor( idPrefix, parent, text )
	{
		super( idPrefix, parent );

		this.setSize( 200, 60 );
    
		this.input = document.createElement( 'input' );
        this.input.setAttribute( 'type', 'file' );  
        this.input.setAttribute( 'id', this.id + '_input' );                   
        this.input.hidden = true;
        
        this.inputLabel = document.createElement( 'label' );
        this.inputLabel.setAttribute( 'for', this.id + '_input' );   
        this.inputLabel.innerHTML = text;
        this.inputLabel.classList.add( "flabel" );

        this.inputDiv = document.createElement( 'div' );       
        this.inputDiv.setAttribute( 'id', this.id + '_inputDiv' );           
        
        this.inputDiv.append( this.inputLabel );
        this.inputDiv.append( this.input );    
        this.setHasBorder( false );
        this.inputLabel.style = 
          `background-color: rgba( 32, 79, 110, 0.3 );
          color: rgb( 90, 90, 90 );    
          text-shadow: 1px 1px rgb(0,0,0,0.2);            
          font-weight : bold;            
          width: 160px;
          padding: 0.4rem;
          text-align: center;
          border-radius: 10px;
          border: 1px solid #000000;
          display: block;
          box-shadow: 0px 0px 3px 0px rgba( 0,0,0,0.2);
          cursor: pointer;`

		document.querySelector( this.getSelector() ).append( this.inputDiv );
		return this;
	}

	getInputElement()
	{
		return this.input;
	}
}