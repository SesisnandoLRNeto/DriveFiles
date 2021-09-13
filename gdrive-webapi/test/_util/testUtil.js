import { Readable, Transform, Writable } from 'stream'
import { jest } from '@jest/globals'
 
export default class TestUtil {

    static mockDateNow(mockImplemetationPeriods){
        const now = jest.spyOn(global.Date, global.Date.now.name)

        mockImplemetationPeriods.forEach(time => {
            now.mockReturnValueOnce(time);
        })
    }

    static getTimeFromDate(dateString){
        return new Date(dateString).getTime()
    }
    
    static generateReadableStream(data) {
        return new Readable({
            objectMode: true,
            async read(){
                for(const item of data){
                    this.push(item) //passing data or little part to the next demand
                }
                this.push(null)
            }
        })
    }

    static generateWritebaleStream(onData){
        return new Writable({
            objectMode: true,
            write(chunk, encoding, cb) { 
                onData(chunk)
                cb(null, chunk)
            }
        })
    }

    static generateTransformStream(onData){
        return new Transform({
            objectMode: true,
            transform(chunk, encoding, cb) { 
                onData(chunk)
                cb(null, chunk)
            }
        })
    }
}