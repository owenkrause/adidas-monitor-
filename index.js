import { Monitor } from './src/monitor.js'

// put product IDs in here, can be found in the url
let pids = []


for( let x = 0; x < pids.length; x++ ) {
  new Monitor(pids[x])
}
