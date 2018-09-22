'use strict'
const cote = require('cote')
const u = require('elife-utils')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with the communication manager.
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
}

const commMgrClient = new cote.Requester({
    name: 'Elife-Invite -> CommMgr',
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = msg
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}

let msKey = 'everlife-invite-demo-svc'
/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager so we can handle requests for Everlife-Invite.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
    }, (err) => {
        if(err) u.showErr(err)
    })
}

function startMicroservice() {

    /*      understand/
     * The calculator microservice (partitioned by key to prevent
     * conflicting with other services.
     */
    const calcSvc = new cote.Responder({
        name: 'Everlife-Invite Service Demo',
        key: msKey,
    })
    
    calcSvc.on('msg', (req, cb) => {
        console.log("everlife invite")
        if(!req.msg) return cb()
        else{
            handleInvite(req,cb)
        }
    })

    function handleInvite(req,cb){

        const msg = req.msg.trim().toLowerCase()
        console.log(msg)
        if(msg.match(/^create an invite for/i)){
            console.log("generate invite link")
            getInviteCode(req,cb)
        }else if(msg.match(/^use this invite *(.*)/i)){
            const rx = /^use this invite *(.*)/i
            let m = msg.match(rx)
            if(!m) {
                cb(null,true)
                sendReply('Failed to join pub...',req)
            }else{
                cb(null,true)
                acceptInviteCode(req,m[1],cb)
            }
            
        }else if(true){
            console.log("Test 2")
        }

    }
    const client = new cote.Requester({
        name: 'ssb client',
        key: 'everlife-ssb-svc',
    })

    function acceptInviteCode(req,inviteCode,cb){

        client.send({ type: "accept-invite",invite:inviteCode }, (err) => {
            if(err){
                cb(null,true)
                sendReply('Failed to join pub..')
            }
            else {
        
                console.log('posted message');
                client.send({
                    type: 'dump-msgs',
                    opts: {
                        showPvt: true,
                        showCnt: true,
                        showAth: false,
                    },
                }, (err, msgs) => {
                    if(err) console.error(err)
                    else console.log(msgs)
                })
                cb(null, true)
                sendReply(`Invite has been accepted! I'm on pub's network now`,req)

            }
        })
    }

    function getInviteCode(req,cb){
       
        client.send({ type: "create-invite" }, (err,invite) => {
            if(err) {
                cb(null,true)
                sendReply('Faild to create invite')
            }
            else {
                
                console.log('posted message');

                client.send({
                    type: 'dump-msgs',
                    opts: {
                        showPvt: true,
                        showCnt: true,
                        showAth: false,
                    },
                }, (err, msgs) => {
                    if(err) console.error(err)
                    else console.log(msgs)
                })
                cb(null, true)
                sendReply(`Here is your invite ${invite}`,req)

            }
        })
    }

}

main()