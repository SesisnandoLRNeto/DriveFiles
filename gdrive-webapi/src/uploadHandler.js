import Busboy from 'busboy'
import { pipeline } from 'stream/promises'
import { logger } from './logger'
import fs from 'fs'

export default class UploadHandler {
    constructor({io, socketId, downloadsFolder, messageTimeDelay = 200}){
        this.io  = io
        this.socketId  = socketId
        this.downloadsFolder = downloadsFolder
        this.ON_UPLOAD_EVENT ='file-upload'
        this.messageTimeDelay = messageTimeDelay
    }

    canExecute(lastExecution){
      return( (Date.now() - lastExecution) >= this.messageTimeDelay)
    }

    handleFileBytes(fileName) {
        this.lastMessageSent = Date.now()
        
        async function* handleData(data) { 
            let processedAlready = 0

            for await(const chunk of data) {
                yield chunk
                processedAlready += chunk.length

                if(!this.canExecute(this.lastMessageSent)) continue

                this.lastMessageSent = Date.now()
                this.io
                    .to(this.socketId)
                    .emit(this.ON_UPLOAD_EVENT, { processedAlready, fileName })
                    logger.info(`File [${fileName}] got ${processedAlready} bytes to ${this.socketId}`)
            }
        }

        return handleData.bind(this)
    }
    
    async onFile(fieldName, file,fileName){
        const saveTo = `${this.downloadsFolder}/${fileName}`

        await pipeline(
            file,
            this.handleFileBytes.apply(this, [fileName]), 
            fs.createWriteStream(saveTo)
        )

            logger.info(`File [${fileName}] finished`)
    }

    registerEvent(headers, onFinish){
        const busboy = new Busboy({ headers })
        busboy.on('file', this.onFile.bind(this))
        busboy.on('finish', onFinish)

        return busboy
    }
}