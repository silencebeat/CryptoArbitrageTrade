
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require("moment")
const axios = require("axios")
const { v4: uuidv4 } = require('uuid');

const localDir = path.join(__dirname, '../');
const folderName = path.join(localDir, '_log');

const SECRETKEY = "";
const APIKEY = "";

const credentials = Buffer.from(APIKEY + ':' + SECRETKEY).toString('base64');

try {
    fs.mkdirSync(folderName);
} catch (e) {
    if (e.code !== 'EEXIST') {
        console.error(`Failed to create folder '${folderName}': ${e}`);
    }
}

const current_time = new Date().toLocaleString();

fs.appendFileSync(path.join(folderName, 'running.log'), current_time + '\n');


class HITBTCAPI {

    sleep(ms) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      }


    async requestPrivate(endpoint, body, method){

        try {

            let URL = `https://api.hitbtc.com${endpoint}`
            let config = {
                Headers: {
                    'Authorization': 'Basic ' + credentials
                }
            };

            let result = null
            if (method === "get"){
                config.param = this.generateQueryString(body)
                result =  await axios.get(URL, config)
            }else if (method === "post"){
                result =  await axios.post(URL, body, config)
            }else if (method === "delete"){
                result =  await axios.delete(URL, body, config)
            }

            return (result)? result.data: result

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async requestPublic(endpoint, params){
        try {

            let URL = `https://api.hitbtc.com${endpoint}`
            let config = {
            };
            config.params = params
            let result =  await axios.get(URL, config)
            return result.data
        } catch (error) {
            console.log(error)
            throw error
        }
    }


    async GetBidPriceOnHitBTC(Coin){
        let price = 0;
        try {
            let response = await this.requestPublic(`/api/2/public/ticker/${Coin}BTC`, {})
            price = response.bid
            
        } catch (error) {
            console.log(error)
        }

        return price
    }

    async getAskPriceOnHitBTC(Coin){
        let price = 0;
        try {
            let response = await this.requestPublic(`/api/2/public/ticker/${Coin}BTC`, {})
            price = response.ask
            
        } catch (error) {
            console.log(error)
        }

        return price
    }

    async getSellOrderBookOnHitBTC(Coin){
        let df = {
            Price: [],
            Qty: [],
            Total: []
        };
        try {
            let data = await this.requestPublic(`/api/2/public/orderbook/${Coin}BTC`, {
            })

            df = data.bid.map(item => ({
                Price: parseFloat(item.price),
                Qty: parseFloat(item.size),
                Total: parseFloat(item.price) * parseFloat(item.size),
            }));

        } catch (error) {
            console.error(error);

            if (error.response && error.response.data && error.response.data.message === 'Symbol not found') {
                return df;
            } else {
                await getSellOrderBookOnHitBTC(Coin);
            }
        }
        return df;
    }

    async getBuyOrderBookOnHitBTC(Coin){
        let df = {
            Price: [],
            Qty: [],
            Total: []
        };
        try {
            let data = await this.requestPublic(`/api/2/public/orderbook/${Coin}BTC`, {
            })

            df = data.ask.map(item => ({
                Price: parseFloat(item.price),
                Qty: parseFloat(item.size),
                Total: parseFloat(item.price) * parseFloat(item.size),
            }));

        } catch (error) {
            console.error(error);

            if (error.response && error.response.data && error.response.data.message === 'Symbol not found') {
                return df;
            } else {
                await getSellOrderBookOnHitBTC(Coin);
            }
        }
        return df;
    }

    async getSellOrderBookVolumeOnHitBTC(coin, sellingPrice) {
        let orderBookVolume2 = 0;
        let ob = [];
    
        try {
            ob = await this.getSellOrderBookOnHitBTC(coin);
            ob = ob.filter(item => item.Price >= sellingPrice);
            orderBookVolume2 = ob.reduce((total, item) => total + item.Total, 0);
        } catch (error) {
            console.error(error);
            await this.getSellOrderBookVolumeOnHitBTC(coin, sellingPrice);
        }
    
        return orderBookVolume2;
    }

    roundDown(n, d) {
        d = parseInt('1' + '0'.repeat(d));
        return Math.floor(n * d) / d;
    }

    roundUp(n, d) {
        d = parseInt('1' + '0'.repeat(d));
        return Math.ceil(n * d) / d;
    }

    print_full(x) {
        for (const row of x) {
            console.log(row);
        }
    }

    async populateHitBTCPriceList(){
        let control = false;
        // let hitBTCPriceList = []

        let markets = []
        let markets3 = []
        let asks = []
        let bids = []
        try {

            let data = await this.requestPublic('/api/2/public/ticker', {
            })


            const [Coins,Statuses] = await this.getHitBTCCoinStatus();

            for (const item of data) {
                const symbol = item.symbol;
                const coin1 = symbol.slice(0, -3);
                const coin2 = symbol.slice(-3);
    
                let conth = false;
    
                if (!item.ask || !item.bid || ['FCN', 'CAT', 'BTG', 'LDC', 'WRC', 'SMART'].includes(symbol)) {
                    continue;
                }
    
                for (let j = 0; j < Coins.length; j++) {
                    if (symbol.includes(Coins[j])) {
                        if (!Statuses[j]) {
                            conth = true;
                            break;
                        }
                    }
                }
    
                if (conth) {
                    continue;
                }

                markets.push( coin1 + '-' + coin2)
                markets3.push(coin1 + '-' + coin2)
                asks.push(parseFloat(item.ask))
                bids.push(parseFloat(item.bid))
    
                // hitBTCPriceList.push({
                //     symbol: coin1 + '-' + coin2,
                //     symbol2: coin1 + '-' + coin2,
                //     HitBTCAskPrice: parseFloat(item.ask),
                //     HitBTCBidPrice: parseFloat(item.bid),
                // });
            }

            const HitBTCPriceList = {
                symbol: markets3,
                symbol2: markets3,
                AskPrice: asks,
                BidPrice: bids,
            };
    
            return HitBTCPriceList;
    
        } catch (error) {
            console.error(error);
            control = true;
        }
    }

    async getHitBTCCoinBalance(Coin){
        let Balance = 0.0;
        try {
            let balances = await this.requestPrivate(`/api/2/trading/balance`, {}, "get")
            
            const filteredBalance = balances.find(b => b.currency === Coin);

            if (filteredBalance) {
                console.log('GetHitBTCCoinBalance:', filteredBalance);
                return parseFloat(filteredBalance.available);
            } else {
                console.log('GetHitBTCCoinBalance: Coin not found');
                return 0; // or any default value you prefer
            }
            
        } catch (error) {
            console.log(error)
        }

        return Balance;
    }

    async getHitBTCAccountCoinBalance(Coin){
        let Balance = 0.0;
        try {
            let balances = await this.requestPrivate(`/api/2/account/balance`, {}, "get")
            
            const filteredBalance = balances.find(b => b.currency === Coin);

            if (filteredBalance) {
                console.log('GetHitBTCCoinBalance:', filteredBalance);
                return parseFloat(filteredBalance.available);
            } else {
                console.log('GetHitBTCCoinBalance: Coin not found');
                return 0; // or any default value you prefer
            }
            
        } catch (error) {
            console.log(error)
        }

        return Balance;
    }

    async buyOnHitBTC(pair, Price){
        const [Coin1, Coin2] = pair.split("-");

        try {

            const stepSize = await this.GetStepSizeOnHitBTC(Coin1 + Coin2);
            let balance = await this.GetHitBTCCoinBalance(Coin2)
            balance = (balance*0.90) / Price

            let qty = '';

            if (stepSize.indexOf('1') === 0) {
                if (stepSize.indexOf('.') === 3) {
                    qty = 100 * Math.floor(balance / 100);
                } else {
                    qty = Math.floor(balance);
                }
            } else {
                qty = this.roundDown(balance, stepSize.indexOf('1'));
            }

            console.log(qty);

            const orderData = {
                symbol: `${Coin1}${Coin2}`,
                side: 'buy',
                quantity: qty.toString(),
                type: 'market',
            };


            let order = await this.requestPrivate("/api/2/order"
                ,orderData, "post")

            console.log(data)
            return order
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async sellOnHitBTC(pair, price){
        const [Coin1, Coin2] = pair.split("-");

        try {

            const stepSize = await this.GetStepSizeOnHitBTC(Coin1 + Coin2);
            let balance = await this.GetHitBTCCoinBalance(Coin2)

            let qty = '';

            if (stepSize.indexOf('1') === 0) {
                if (stepSize.indexOf('.') === 3) {
                    qty = 100 * Math.floor(balance / 100);
                } else {
                    qty = Math.floor(balance);
                }
            } else {
                qty = this.roundDown(balance, stepSize.indexOf('1'));
            }

            console.log(qty);

            const orderData = {
                symbol: `${Coin1}${Coin2}`,
                side: 'sell',
                quantity: qty.toString(),
                type: 'market',
            };


            let order = await this.requestPrivate("/api/2/order"
                ,orderData, "post")

            console.log(data)
            return order
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async withdrawFromHitBTC(Coin,SaleOrPurchase,Address,Qty){
        console.log("WithdrawFromHitBTC...")
        try {

            let amt;

            if (SaleOrPurchase === 'Purchase') {
                amt = await getHitBTCAccountCoinBalance(Coin) - await getHitBTCWithdrawalFee(Coin);
            } else {
                amt = Qty - await getHitBTCWithdrawalFee(Coin);
            }

            const orderData = {
                currency: Coin,
                amount: amt,
                address: Address,
            };
        

            await this.requestPrivate("/api/2/account/crypto/withdraw", orderData, "post")

            return true;
            
        } catch (error) {
            this.withdrawFromHitBTC(Coin,SaleOrPurchase,address, qty)
        }
    }

    async getHitBTCAddress(Coin){

        try {

            let data = await this.requestPrivate(`/api/2/account/crypto/address/${Coin}`, {
            }, "get")

            return data.address

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getHitBTCCoinStatus(){

        let Statuses = []
        let Coins = []

        try {
            let data = await this.requestPublic("/api/2/public/currency", {}, "get")
    
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                Coins.push(element.id);
                Statuses.push(element.payinEnabled)
            }
          
            return [Coins, Statuses]
                
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async TransferToTradingAccount(Coin){
        console.log("TransferToTradingAccount...")
        try {

            const orderData = {
                currency: Coin,
                amount: amt,
                type: "bankToExchange",
            };
        
            let r = await this.requestPrivate("api/2/account/transfer", orderData, "post")
            console.log(r)
            return true;
            
        } catch (error) {
            throw error
        }
    }

    async DownloadStepSizesOnHitBTC() {
        console.log("GetHitBTCCoinStatus...")
        try {
            let data = await this.requestPublic("/api/2/public/symbol", {})
            const symbols = [];
            const stepsizes = [];

            for (let i = 0; i < data.length; i++) {
                symbols.push(data[i].id);
                const quantityIncrement = parseFloat(data[i].quantityIncrement) || 0;
                stepsizes.push(quantityIncrement);
            }

            const stepSizes = {
                symbol: symbols,
                step: stepsizes,
            };

            const jsonString = JSON.stringify(stepSizes, null, 2);

            fs.writeFileSync('StepSizesOnHitBTC.json', jsonString);

            console.log('Downloaded and saved StepSizesOnHitBTC.json');
        } catch (error) {
            
        }
    }

    GetStepSizeOnHitBTC(Coin){
        try {
            const data = fs.readFileSync('StepSizesOnHitBTC.json', 'utf8');
            const df = JSON.parse(data);
    
            const foundCoin = df.find((entry) => entry.symbol === Coin);
    
            if (foundCoin) {
                return parseFloat(foundCoin.step);
            } else {
                // Handle the case when the coin is not found
                console.error(`Coin ${Coin} not found in StepSizesOnHitBTC.json`);
                return null; 
            }
        } catch (err) {
            console.error(err);
            // Handle errors when reading the file
            return null; // or throw an error
        }
    }

    async TransferToBank(Coin,qty){

        console.log("TransferToBank...")
        try {

            const orderData = {
                currency: Coin,
                amount: qty,
                type: "exchangeToBank",
            };
        
            let r = await this.requestPrivate("api/2/account/transfer", orderData, "post")
            console.log(r)
            return true;
            
        } catch (error) {
            throw error
        }
    }

    async getHitBTCWithdrawalFee(Coin) {
        console.log('GetHitBTCWithdrawalFee...');

        try {
            const data = await this.requestPublic('/api/2/public/currency', {
            });
    
            const filteredCurrencies = data.filter(currency => currency.id === Coin);
    
            if (filteredCurrencies.length > 0) {
                const payoutFee = parseFloat(filteredCurrencies[0].payoutFee);
                console.log('Withdrawal Fee:', payoutFee);
                return payoutFee;
            } else {
                console.error(`Currency ${Coin} not found.`);
                return null;
            }
        } catch (error) {
            console.error('GetHitBTCWithdrawalFee Error:', error.message);
            throw error;
        }
    }

    
    async initiateOnHitBTC(Pair, Price, address){
        try {
            const [Coin1, Coin2] = pair.split("-");
            await this.buyOnHitBTC(Pair, Price);
            await this.TransferToBank(Coin1, await GetHitBTCCoinBalance(Coin1))
            await this.withdrawFromHitBTC(Coin1, "Purchase", address, "")
        } catch (error) {
            
            console.log(error)
            throw error
        }
    }

    async closeOnHitBTC(Pair,Price,address) {
        try {
            const [Coin1, Coin2] = Pair.split('-');
    
            let A = await this.getHitBTCCoinBalance(Coin2)
            await this.sellOnHitBTC(Pair, Price)
            this.sleep(10)
            let B = await this.GetHitBTCCoinBalance(Coin2);
            await this.TransferToBank(Coin2, B - A)
            await this.withdrawFromHitBTC(Coin2, "Sale", address, (B-A))
        } catch (error) {
            console.log(error)
        }
        
    }
}

module.exports = new HITBTCAPI()