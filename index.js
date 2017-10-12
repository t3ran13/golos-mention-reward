const ga = require("golos-addons");
const global = ga.global;
const golos = ga.golos;
const golosjs = golos.golos;

global.initApp("otkat");

golos.setWebsocket(global.CONFIG.golos_node);

const log = global.getLogger("index");

const USER = global.CONFIG.userid;
const KEY = global.CONFIG.key;
const PERCENT = global.CONFIG.voter_reward_percent;
const MEMO = global.CONFIG.memo;

const BROADCAST = global.broadcast;
let STRICT = true;

for(let val of process.argv) {
    if(val.match(/ignorecheck/)) {
        STRICT = false;
    }
}


function getPermlink() {
    for(let val of process.argv) {
        let m = val.match(/^permlink=([^ ]+)$/);
        if(m) {
            return m[1];
        }
    }
    return null;
}

function usage() {
    log.info("usage: node index.js permlink=socrealizm-kotorogo-vy-ne-videli-7")
}

async function getContent(permlink) {
    const content = await golos.getContent(USER, permlink);
    if(!content) {
        log.error("post for the permlink is not found!");
        process.exit(1);
    }    
    return content;
}


class Scanner {
    constructor(content) {
        this.content = content;
        this.starttime = Date.parse(content.created);
        this.author_reward = 0;
    }

    process(he) {
        const tr = he[1];
        const time = Date.parse(tr.timestamp);
        if(time < this.starttime) {
            return true;
        }
        const op = tr.op[0];
        const opBody = tr.op[1];

        switch(op) {
            case "author_reward":
                if(opBody.permlink == this.content.permlink) {
                    this.author_reward = parseFloat(opBody.sbd_payout.split(" ")[0]);
                }
                break;
        }
    }
}

async function collectInfos(content) {
    const scanner = new Scanner(content);
    await golos.scanUserHistory(USER, scanner);
    return scanner;
}

async function getUserGBG() {
    const user = await golos.getAccount(USER);
    if(!user) {
        log.error("account " + USER + " does not exists!");
        process.exit(1);
    }
    return parseFloat(user.sbd_balance.split(" ")[0]);
}

function sumRshares(content) {
    let sum = 0;
    for(let v of content.active_votes) {
        if(v.rshares > 0) {
            sum += v.rshares / 1000000;
        }
    }
    return sum;
}

function getUsersFromMeta(content) {
    let meta = JSON.parse(content.json_metadata);
    return meta;
}

async function transfer(voter, amount, memo) {

    log.info("transfer " + amount + " to " + voter + " (" + memo + ")");
    let sent = false;
    let i = 0;
    for(; !sent && i < 3; i++) {
        try {
            if(BROADCAST) {
                await golos.transfer(KEY, USER, voter, amount, memo);
            } else {
                log.info("no broadcasting, no transfer");
            }
            sent = true;
        } catch(e) {
            log.error(golos.getExceptionCause(e));
        }
    }    
    if(i >= 3) {
        log.error("was unable to transfer after 3 tries, exiting");
        process.exit(1);
    }
}

async function doTransfers(content, reward, sum_rshares, memo) {
    let sum_transfered = 0;
    content.active_votes.sort((a,b) =>  {return b.rshares - a.rshares});
    for(let v of content.active_votes) {
        log.debug("user " + v.voter);
        if(global.CONFIG.bypass.includes(v.voter)) {
            log.info("bypass transfer to " + v.voter);
            continue;
        }
        // bypass own account
        if(global.CONFIG.userid == v.voter) {
            log.info("bypass transfer to own account: " + v.voter);
            continue;
        }
        const rshares = v.rshares / 1000000;
        log.debug("rshares = " + rshares);
        if(rshares <= 0) {
            log.info(v.voter + " flagged, no payout");
            continue;
        }
        let payout = rshares * reward / sum_rshares;
        if(payout < 0.001) {
            log.debug("user's calculated payout < 0.001, increased to 0.001");
            payout = 0.001;
        }
        log.debug("user's payout " + payout);
        sum_transfered += payout;
        const amount = payout.toFixed(3) + " GBG";
        await transfer(v.voter, amount, memo);
    }
    log.info("\n\ntransferred " + sum_transfered.toFixed(3) + " GBG");
}


async function run() {


    let permlink = getPermlink();
    if(!permlink) {
        usage();
        process.exit(1);
    }
    log.info("userid = " + USER);
    log.info("permlink = " + permlink);

    const user_gbg = await getUserGBG();
    log.info("user's balance = " + user_gbg);


    const content = await getContent(permlink);
    const infos = await collectInfos(content);

    log.info("found reward for the post " + infos.author_reward.toFixed(3) + " GBG" );
    const reward = infos.author_reward * PERCENT / 100;
    log.info("reward to pay " + reward.toFixed(3) + " GBG (" + PERCENT + "%)" );
    
    if(reward > user_gbg) {
        log.error("!!!!  user balance is not enough for reward payout  !!!");
        if(STRICT) {
            process.exit(1);
        }
    }

    const sum_rshares = sumRshares(content);
    log.info("Mrshares total " + sum_rshares);

    const memo = MEMO + " " + `https://golos.io/${content.parent_permlink}/@${content.author}/${content.permlink}`;
    log.info("memo = " + memo);

    log.info(`
    ${(!BROADCAST?"Broadcasting is not enabled! NO transfers. Add \"broadcast\" parameter":"")}
    Press any key to do transfer or Ctrl-C to terminate...
`);
        if(!BROADCAST) {
            // properly handle SIGINT (CTRL-C in docker), https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
            if (process.platform === "win32") {
              var rl = require("readline").createInterface({
                input: process.stdin,
                output: process.stdout
              });

              rl.on("SIGINT", function () {
                process.emit("SIGINT");
              });
            }

            process.on("SIGINT", function () {
              //graceful shutdown
              process.exit();
            });
            await prompt();
        } else {
            log.info("Broadcasting enabled, start transferring in 5 sec.");
            await global.sleep(5000);
        }    

    await doTransfers(content, reward, sum_rshares, memo);
    log.info("DONE");
    process.exit(0);
}

async function prompt() {

    var stdin = process.stdin,
        stdout = process.stdout;

    return new Promise(resolve => {
        stdin.resume();
        stdin.once('data', function (data) {
            resolve();
        });
    });
}

run();