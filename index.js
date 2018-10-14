'use strict'
const cote = require('cote')({statusLogsEnabled:false})
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
    name: 'Elife-NW -> CommMgr',
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
 * manager so we can handle requests for Everlife-NW.
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
     * The microservice (partitioned by key to prevent
     * conflicting with other services.
     */
    const svc = new cote.Responder({
        name: 'Everlife-NW Service',
        key: msKey,
    })

    svc.on('msg', (req, cb) => {
        if(!req.msg) return cb()

        const msg = req.msg.trim()
        if(msg.match(/^create an invite for/i)) {
            // TODO: Get number of invites from user
            // TODO: Move matching code to elife-utils
            cb(null, true)
            getInviteCode(req)
        } else if(msg.match(/^use this invite *(.*)/i)) {
            cb(null, true)
            const rx = /^use this invite *(.*)/i
            let m = msg.match(rx)
            if(!m) sendReply('Failed to find invite to use...',req)
            else acceptInviteCode(req, m[1])
        } else {
            // TODO: Skill matching is delicate - if response doesn't
            // happen the message gets 'swallowed'
            cb()
        }
    })

}

const client = new cote.Requester({
    name: 'NW -> SSB',
    key: 'everlife-ssb-svc',
})

function acceptInviteCode(req, inviteCode) {
    sendReply('Trying to contact pub with your invite...', req)
    client.send({ type: "accept-invite", invite:inviteCode }, (err) => {
        if(err) {
            u.showErr(err)
            sendReply('Failed to join pub...', req)
        } else {
            sendReply(`Invite has been accepted! I'm on pub's network now`, req)
        }
    })
}

function getInviteCode(req) {
    client.send({ type: "create-invite" }, (err, invite) => {
        if(err) sendReply('Faild to create invite')
        else sendReply(`Here is your invite ${invite}`,req)
    })
}

main()
