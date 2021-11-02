
class HistogramModel
{
    constructor( data , nBins = 256)
    {
        let xMax = this.calculateMax(data)
        let xMin = this.calculateMin(data)
        // // calculate the range of each bin
        let range = (xMax - xMin)/nBins
        // calculate the amount of number that falls into each bin
        var bars = new Array(Math.ceil(nBins)+1).fill(0)
        for(var index = 0; index < nBins+1; index++) {
            bars[index] = 0
        }
        for(var index  = 0; index <  data.length; index++)
        {
      
            bars[Math.floor((data[index] - xMin)/range)] += 1 
        }
        let p = bars.map((a) => (a/data.length))
        // calcalute the proportional height of bar
        // HistogramView will multiply this proportional height by actual canvas height to draw bars
        let yMax = this.calculateMax(bars)
        let yMin = this.calculateMin(bars)
        let pBarsHeight = bars.map((a) => ((a-yMin)/(yMax-yMin)))


        // public member variables 
        this.nBins = nBins
        this.range = range
        this.xMax = xMax
        this.xMin = xMin
        this.yMax = yMax
        this.yMin = yMin
        this.bars = bars
        this.pBarsHeight = pBarsHeight
        this.p = p
    }
    
    calculateMax(arr) {
        return arr.reduce((max, v) => max >= v ? max : v, -Infinity);
    }
    calculateMin(arr) {
        return arr.reduce((min, v) => min <= v ? min : v, Infinity);

    }
    // setnBins(nBins) {
    //     let xMax = this.xMax
    //     let xMin = this.xMin
    //     this.nBins = nBins
    //     this.range = (xMax - xMin)/nBins
    //     // bars
    //     var bars = new Array(nBins+1).fill(0)
    //     for(var index  = 0; index <  data.length; index++)
    //     {
    //         bars[Math.floor((data[index] - xMin)/range)] += 1 
    //     }
    //     this.bars = bars

    //     // p
    //     let p = bars.map((a) => (a/data.length))
    //     this.p = p

    //     // y Max and Min
    //     let yMax = this.calculateMax(bars)
    //     let yMin = this.calculateMin(bars)
    //     this.yMax = yMax
    //     this.yMin = yMin

    //     // proportional bars height
    //     let pBarsHeight = bars.map((a) => ((a-yMin)/(yMax-yMin)))
    //     this.pBarsHeight = pBarsHeight
        
    // }
    
}
class myHistogramModel {

}