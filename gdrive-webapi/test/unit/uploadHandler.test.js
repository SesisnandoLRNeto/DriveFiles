import {
    describe,
    test,
    expect,
    beforeEach,
    jest
} from '@jest/globals'
import UploadHandler from '../../src/uploadHandler.js'
import TestUtil from '../_util/testUtil.js'
import fs from 'fs'
import { resolve } from 'path'
import { pipeline } from 'stream/promises'
import { logger } from '../../src/logger.js'

describe('#UploadHandler', () => {
    const ioObj = {
        to: (id) => ioObj,
        emit: (event, message) => { }
    }

    beforeEach(()=>{
        jest.spyOn(logger, 'info')
            .mockImplementation()
    })

    describe('#registerEvent', ()=>{
        test('should call onFile and onFinish functions on Busboy instance', ()=>{
            const uploadHandler = new UploadHandler({
                io: ioObj,
                socketId: '01'  
            })

            jest.spyOn(uploadHandler, uploadHandler.onFile.name)
                .mockResolvedValue()

            const headers = {
                'content-type': 'multipart/form-data; boundary='
            }
            const fn = jest.fn()
            const busboyInstance = uploadHandler.registerEvent(headers, fn)

            const fileStream = TestUtil.generateReadableStream([ 'chunk', 'of', 'data' ])
            
            busboyInstance.emit('file', 'fieldName', fileStream, 'fileName.txt')

            busboyInstance.listeners('finish')[0].call()

            expect(uploadHandler.onFile).toHaveBeenCalled()
            expect(fn).toHaveBeenCalled()
        })

    })

    describe('#onFile', ()=>{
        test('given stream file it should save it on disk', async()=>{
            const chunk = ['hey', 'dude']
            const downloadsFolder = '/tmp'
            const handler = new UploadHandler({
                io: ioObj,
                socketId: '01',
                downloadsFolder
            })

            const onData = jest.fn()
            jest.spyOn(fs, fs.createWriteStream.name)
                .mockImplementation(()=> TestUtil.generateWritebaleStream(onData))

            const onTransform = jest.fn()
            jest.spyOn(handler, handler.handleFileBytes.name)
                .mockImplementation(()=> TestUtil.generateTransformStream(onTransform))

            const params = {
                fieldName: 'video',
                file: TestUtil.generateReadableStream(chunk),
                fileName: 'mockFile.mov'
            }
            
            await handler.onFile(...Object.values(params))

            expect(onData.mock.calls.join()).toEqual(chunk.join())
            expect(onTransform.mock.calls.join()).toEqual(chunk.join())
            
            const expectedFileName = resolve(handler.downloadsFolder, params.fileName)
            expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFileName)
        })
    })

    describe('#handleFileBytes', ()=>{
        test('should call emit function and it is a transform stream', async ()=>{
            jest.spyOn(ioObj, ioObj.to.name)
            jest.spyOn(ioObj, ioObj.emit.name)

            const handler = new UploadHandler({
                io: ioObj,
                socketId: '01'
            })

            jest.spyOn(handler, handler.canExecute.name)
                .mockReturnValueOnce(true)

            const messages = ['hello']
            const source = TestUtil.generateReadableStream(messages)

            const onWrite = jest.fn()
            const target = TestUtil.generateWritebaleStream(onWrite)

            await pipeline(
                source,
                handler.handleFileBytes("fileName.txt"),
                target
            )

            expect(ioObj.to).toHaveBeenCalledTimes(messages.length)
            expect(ioObj.emit).toHaveBeenCalledTimes(messages.length)

            // if handlerFileBytes being a transform stream, our pipeline continue the progress
            // passing datas to nexte and call our function in target to each chunk
            expect(onWrite).toHaveBeenCalledTimes(messages.length)
            expect(onWrite.mock.calls.join()).toEqual(messages.join())

        })

        test('given message timerDelay as 2secs it should emit only two messages during 2 seconds period', async()=>{
            jest.spyOn(ioObj, ioObj.emit.name)

            const day = '2021-07-01 01:01'
            const onInitVariable = TestUtil.getTimeFromDate(`${day}:00`)

            const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`)
            const onSecondUpdateLastMessageSent = onFirstCanExecute

            const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`)

            const onThridCanExecute = TestUtil.getTimeFromDate(`${day}:04`)

            TestUtil.mockDateNow(
                [
                    onInitVariable,
                    onFirstCanExecute,
                    onSecondUpdateLastMessageSent,
                    onSecondCanExecute,
                    onThridCanExecute
                ]
            )
            
            const messages = ['hello', 'hello', 'world']
            const fileName = 'fileName.txt'
            const expectedMessageSent = 2
            const messageTimeDelay = 2000

            
            const source = TestUtil.generateReadableStream(messages)
            const handler = new UploadHandler({
                io: ioObj,
                socketId: '01',
                messageTimeDelay
            })
            
            await pipeline(
                source,
                handler.handleFileBytes(fileName)
            )
                
            expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessageSent)
            
            const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls
            expect(firstCallResult).toEqual([handler.ON_UPLOAD_EVENT, { processedAlready: "hello".length, fileName }])
            expect(secondCallResult).toEqual([handler.ON_UPLOAD_EVENT, { processedAlready: messages.join("").length, fileName }])
        })
    })

    describe('#canExecute', ()=> {
        test('should return true when time is later than specified delay', ()=>{
            const messageTimeDelay = 1000
            const uploadHandler = new UploadHandler({
                io: {},
                socketId: '',
                messageTimeDelay
            })

            const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:03')
            TestUtil.mockDateNow([tickNow])

            const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:00')

            const result = uploadHandler.canExecute(lastExecution)
            expect(result).toBeTruthy()
        })
        test('should return false when time isnt later than specified delay', ()=>{
            const timeDelay = 3000
            const uploadHandler = new UploadHandler({
                io: {},
                socketId: '',
                messageTimeDelay: timeDelay
            })

            const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:02')
            TestUtil.mockDateNow([tickNow])

            const lastExecution = TestUtil.getTimeFromDate('2021-07-01 00:00:01')

            const result = uploadHandler.canExecute(lastExecution)
            expect(result).toBeFalsy()
        })
        
    })
})