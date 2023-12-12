import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters'

const API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes/';

const NO_COVER_IMG_LINK = 'https://upload.wikimedia.org/wikipedia/commons/9/9b/No_cover.JPG?20070608130414';
let startIndex = 0;

const bot = new Telegraf('5985951539:AAFknqhLK4PftVA-GPqvsb__rNDL4lD87HQ');

bot.start((ctx) => {
  ctx.reply("Try to find something");
});

bot.on(message('text'), async (ctx) => {
  startIndex = 0;
  searchBook(ctx, ctx.message.text);
});

async function searchBook(ctx, message) {
  console.log(message)
  const query = getQuery(message);
  try {
    const res = await find(query);
    const foundBooks = [...res.items];

    for (let i in foundBooks) {
      let butName = `book_${foundBooks[i].id}`;

      await ctx.replyWithPhoto({ url: foundBooks[i].volumeInfo?.imageLinks?.thumbnail || NO_COVER_IMG_LINK },
        {
          caption: `"${foundBooks[i].volumeInfo.title}"`,
          ...Markup.inlineKeyboard([Markup.button.callback('Press to take more info', butName)])
        });

      await addDescriptionButton(butName, foundBooks[i].id);
    }

    await ctx.reply('Didn\'t find the book?', Markup.inlineKeyboard([Markup.button.callback('More results', `butt_more_${message.split(' ').join('_')}`)]));
    addMoreButton(`butt_more_${message.split(' ').join('_')}`, message);
  } catch (e) {
    await ctx.reply("Sorry, we have a problem(");
    console.log(e);
  }
}

function addMoreButton(name, message) {
  bot.action(name, async (ctx) => {
    startIndex += 10;
    try {
      await ctx.answerCbQuery();
      await searchBook(ctx, message);
    } catch (e) {
      await ctx.reply("Sorry, we have a problem(");
      console.log(e);
    }
  });
}

async function addDescriptionButton(name, id) {
  bot.action(name, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const res = await find(id);

      const info = res.volumeInfo;
      let description = info.description || "This book doesn't have description"
      if (/<\/?[^>]+(>|$)/g.test(description)) description = description.replace(/<\/?[^>]+(>|$)/g, "");
      let authors = info.authors || "The author is unknown";
      if (typeof authors != 'string') authors = authors.join(', ');
      if (description.length > 1000) description = description.slice(0, 1007).concat('...');
      await ctx.replyWithPhoto({ url: info?.imageLinks?.extraLarge || info?.imageLinks?.thumbnail || NO_COVER_IMG_LINK },
        { caption: `"${info.title}"\nAuthors: ${authors}` });
      await ctx.reply('Publisher: ' + (info?.publisher || 'Unfortunately, we don\'t know(') + '\n' +
        'Count of pages: ' + (info?.pageCount || 'Unfortunately, we don\'t know(') + '\n' +
        'Publication date: ' + (info?.publishedDate || 'Unfortunately, we don\'t know(') + '\n' +
        'Price: ' + (res?.saleInfo?.retailPrice?.amount || 'Unfortunately, we don\'t know(') + '\n' +
        'Description: ' + '\n' + description + '\n\n' +
        'Read a sample: ' + (res?.accessInfo?.webReaderLink || 'Unfortunately, we don\'t know(') + '\n' +
        'Link in Google Books: ' + (res?.volumeInfo?.infoLink || 'Unfortunately, we don\'t know('));
    } catch (e) {
      await ctx.reply("Sorry, we have a problem(");
      console.log(e);
    }
  });
}

async function find(path) {
  const url = API_BASE_URL + path;

  const response = await fetch(url);
  return await response.json();
}

function getQuery(message) {
  return '?q=' + message.split(' ').join('+') + '&printType=books' + '&download=epub' + `&startIndex=${startIndex}`;
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));