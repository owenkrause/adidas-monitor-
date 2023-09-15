import { instance, sendWebhook, sleep, getProxy, getTime } from './utils.js'

export class Monitor {

  constructor(pid) {
    this.pid = pid
    this.proxy = getProxy()
    this.productInfo = {}
    this.previousStock = []
    this.currentStock = []
    this.start()
  }
  
  async getProductInfo() {

    // initializes product info 
    try {
      const response = await instance.get(`https://www.adidas.com/api/products/${this.pid}?sitePath=us`, { proxy: false, httpsAgent: this.proxy })
      this.productInfo = {
        pid: response.data.id,
        title: response.data.name,
        color: response.data.attribute_list.color,
        price: response.data.pricing_information.currentPrice,
        image: response.data.view_list[0].image_url,
        discountable: response.data.callouts ? ( response.data.callouts.callout_top_stack[0].id.includes('pdp-promo-nodiscount') ? false : true ) : true
      }
    }
    catch(err) {
      if( err.response ) {
        // 404 means product isnt loaded
        if( err.response.status === 404 ) return
        console.log(`${getTime()} ${this.pid} ${err.message}`)
      }
      else console.log(`${getTime()} ${this.pid} ${err.message}`)
      await sleep(5000)
      return await this.init()
    }
  }
  
  async init() {
    try {
      const response = await instance.get(`https://www.adidas.com/api/products/${this.pid}/availability?sitePath=us`, { proxy: false, httpsAgent: this.proxy })
      
      // sometimes endpoint returns no variations
      if( !response.data.variation_list ) {
        const t2 = performance.now()
        console.log(`${getTime()} Initialized ${this.pid} no variations found ${(t2-t1).toFixed(2)}ms`)
        return this.previousStock = []
      }
      for( let x = 0, n = response.data.variation_list.length; x < n; x++ ) {
        this.previousStock[x] = { 
          size: response.data.variation_list[x].size,
          qty: response.data.variation_list[x].availability 
        }
      }
      console.log(`${getTime()} Initialized ${this.pid}`)
      await sleep(5000)
    }
    catch (err) {
      const t2 = performance.now()
      if( err.response ) {
        // product not loaded, sets previous stock to empty array
        if( err.response.status === 404 ) {
          this.previousStock = []
          console.log(`${getTime()} Initialized ${this.pid} (product not loaded) ${(t2-t1).toFixed(2)}ms`)
          return await this.loop()
        } 
      }
      else console.log(`${getTime()} ${this.pid} ${err}`)
      await sleep(5000)
      return await this.init()
    }
  }

  async loop() {
    while(true) {
      this.currentStock = []
      await instance.get(`https://www.adidas.com/api/products/${this.pid}/availability?sitePath=us`, { proxy: false, httpsAgent: this.proxy })
      .then( response => {

        // if no stock loaded, don't need to check for updates
        if( !response.data.variation_list ) return
        for( let x = 0, n = response.data.variation_list.length; x < n; x++ ) {
          this.currentStock[x] = { 
            size: response.data.variation_list[x].size,
            qty: response.data.variation_list[x].availability
          }
        }
        this.instock = []
        
        // incase they add variations
        if( !this.previousStock.length && this.currentStock.length ) {
          for( let x = 0, n = this.currentStock.length; x < n; x++ ) {
            this.instock.push(`${this.currentStock[x].size} [${this.currentStock[x].qty}]\n`)
          }
          sendWebhook(this.productInfo, this.instock )
          return this.previousStock = [...this.currentStock]
        }

        // checking if previous stock was 0 and current stock is greater than 0
        for( let x = 0, n = this.currentStock.length; x < n; x++ ) {
          this.previousVariant = this.previousStock.find( variant => variant.size === this.currentStock[x].size )
          if( this.currentStock[x].qty > 0 && this.previousVariant.qty === 0 ) {
            console.log(`${getTime()} Restock ${this.pid} ${this.currentStock[x].size} ${this.currentStock[x].qty}`)
            this.instock.push(`${this.currentStock[x].size} [${this.currentStock[x].qty}]\n`)
          } 
        }
        if(this.instock.length) sendWebhook(this.productInfo, this.instock )
        this.previousStock = [...this.currentStock]
      })
      .catch( async err => {
        if( err.response ) { 
          // 404 means not loaded
          if( err.response.status === 404 ) return 
          // 403 proxy ban
          else if( err.response.status === 403 ) this.proxy = getProxy()
        }
        console.log(`${getTime()} ${err.message}`)
      })
      await sleep(5000)
    }
  }

  start = async() => {
    // proxy switch to avoid bans
    setInterval(() => { this.proxy = getProxy() }, 300000)
    // occasionally update product data
    setInterval(() => { this.getProductInfo() }, 60000)
    await this.getProductInfo()
    await this.init()
    await this.loop()
  }
}