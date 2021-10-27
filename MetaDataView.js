
class MetaDataView extends Widget {

    constructor( idPrefix, parent, fields, title, x = 0.0, y = 0.0, width = 400.0, height = 400.0) 
    {
        super( idPrefix, parent, x, y, width, height );

        this.fields = fields
        this.title = title
        return this;
    }

    set( metaData )
    {

        let e = document.querySelector(this.getSelector())
        e.innerHTML = ""
        let title = document.createElement('div')
        title.innerHTML += this.title
        
        e.appendChild(title)
        let table = this.generateTable(metaData)
        e.appendChild(table)
    }
    generateTable(metaData) 
    {
        let table = document.createElement('table')

        for(var index in this.fields)
        {
            var key = this.fields[index]
            var row = document.createElement('tr')
            var field = document.createElement('th')
            field.innerHTML += key
            field.style.textAlign = 'left'
            field.style.width = '40%'
            var value = document.createElement('td')
            value.innerHTML += metaData[key]
            row.appendChild(field)
            row.appendChild(value)
            table.appendChild(row)
        }
        return table
    }
 }
