import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import dayjs from 'dayjs';
import chalk from 'chalk';
const tiebaName = '九阴'
const scanUrl = `https://tieba.baidu.com/c/f/frs/wise?sign=092c170a71aa039133e5dccf5fe36281&kw=${tiebaName}&pn=1&is_good=0&cid=&sort_type=0&is_newfrs=1&is_newfeed=1&rn=30&rn_need=10&model=iPhone&scr_w=390&scr_h=844&_client_type=1&_client_version=12.77.0&subapp_type=newwise`;
import dotenv from 'dotenv';

import OpenAI from "openai";

/**
 * 获取贴吧首页数据
 * @param rqUrl
 * @returns {Promise<*[]>}
 */
 const getTiebaHome = async (rqUrl) => {
    try {
        const response = await axios.get(rqUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            }
        });
        // 创建保存目录
        const dirPath = path.join(process.cwd(), 'data');
        await fs.mkdir(dirPath, {recursive: true});

        // 生成带时间戳的文件名
        const timestamp = dayjs().format('YYYY_MM_DD-HH_mm_ss');
        const fileName = `data_${timestamp}.json`;


        let savaData = []

        response.data.page_data.feed_list.forEach((item, index) => {
            try {
                if (item.layout === 'feed') {
                    let info = {
                        avatar: '',
                        nickname: '',
                        title:'',
                        desc: '',
                        index,
                        path: `https://tieba.baidu.com/p/${item.feed.log_param[1].value}#/`,
                    }
                    for (let j = 0; j < item.feed.components.length; j++) {
                        const obj = item.feed.components[j]

                        if (obj.component === 'feed_head') {
                            info.avatar = obj.feed_head.image_data.img_url
                            info.nickname = obj.feed_head.main_data[0].text.text
                        }
                        if(obj.component === 'feed_title'){
                            info.title = obj.feed_title.data[0].text_info.text
                        }
                        if(obj.component === 'feed_abstract'){

                           for(let b = 0; b < obj.feed_abstract.data.length; b++){
                               if( obj.feed_abstract.data[b].type===1){
                                   info.desc += obj.feed_abstract.data[b].text_info.text
                               }
                           }
                        }
                    }
                    info.merge = `用户【${info.nickname}】发布了帖子：${info.title}_ ${info.desc}`
                    savaData.push(info)
                }
            } catch (e) {
                console.error('数据处理出错:', e);
                console.log(index, '==============')
                console.log(item.feed.components[2].feed_abstract)

            }
        })

        // 保存JSON数据
        await fs.writeFile(
            path.join(dirPath, fileName),
            JSON.stringify(savaData, null, 2), // 使用2空格缩进格式化JSON
            'utf8'
        );

        console.log(`数据已保存到: ${fileName}`);
        let offendingAddressList = []
        for (let i = 0; i < savaData.length; i++) {
            aiChecksPosts(savaData[i].merge).then(res=>{

            }).catch(error=>{

            })
            const address = await inspectionData(savaData[i])
            if (address) {
                offendingAddressList.push(address)
            }

        }

        offendingAddressList.forEach(addressPath => {
            console.warn('发现疑似违规贴，地址：', addressPath)
        })
        return offendingAddressList
    } catch (error) {
        console.error('获取数据失败:', error.message);
        throw error;
    }
}


const frequencyClosedWords = ['小猪狗', '出号','收号','出心血','收','关服','脑残','睿智']
const inspectionData = async (data) => {
    const sentence = data.merge
    // If any forbidden word is found, return the post's path
    const hasBlockedWord = frequencyClosedWords.some(word => sentence.includes(word));
    return hasBlockedWord ? data.path : null;
}



const scanTiebaHome = async () =>{
    try {
        console.log(`开始扫描${tiebaName}贴吧...${dayjs().format('YYYY-MM-DD HH:mm:ss')}`);
        //await getTiebaHome(scanUrl1);
        await getTiebaHome(scanUrl);
        console.log('扫描完成');
        console.warn('=====================')
    } catch (error) {
        console.error('扫描过程中出错:', error);
    }
}


const aiChecksPosts = async (rqContent) =>{
    const openai = new OpenAI({
        baseURL: process.env.GPT_BASEURL,
        apiKey: process.env.GPT_API_KEY
    });

    try{
         console.warn('开始AI核对帖子内容')
         const content = `
       请你判断以下帖子是否违反了百度贴吧的吧规。如果违反了请返回 “违反”和理由，否则返回只“未违反”不用返回理由。 是百度贴吧的 你可以参考以下链接查看：
       https://tieba.baidu.com/p/6889566343`

         const completion = await openai.chat.completions.create({
             messages: [{ role: "system", content: content },{ role: "assistant", content:`铁子:${rqContent}`}],
             model: process.env.GPT_MODEL,
         });
         console.warn(chalk.blue.green.bold('========BEGIN========='))
         console.warn(rqContent)

        if(completion.choices[0].message.content.includes('未违反')){
            console.log((chalk.blue(completion.choices[0].message.content)))
        }else{
            console.log((chalk.red(completion.choices[0].message.content)))
        }

        console.log(chalk.blue.green.bold('========END========='))

     }catch (e){
         console.error('AI核对帖子内容出错:', e);
     }
}


// 每10分钟执行一次扫描
const startScheduledScan = async () => {
    console.log('定时扫描服务已启动');
    cron.schedule('*/5 * * * *', () => {
        scanTiebaHome();
    });
}



export default startScheduledScan