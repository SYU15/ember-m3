import Route from '@ember/routing/route';

export default Route.extend({
  init(...args) {
    this._super(...args);
    this.invocation = 0;
  },

  model() {
    return this.store.queryURL('/api0.json');
  },

  actions: {
    updateData() {
      let vol = this.invocation++ === 0 ? 'I' : Math.random();

      this.store.pushPayload('com.example.bookstore.book', {
        data: {
          id: 'isbn:9780760768570',
          type: 'com.example.bookstore.Book',
          attributes: {
            $type: 'com.example.bookstore.Book',
            name: `Vol ${vol}. The Birth of Britain`,
            author: 'urn:author:1',
            pubDate: 'April 2005',
            readerComments: ['urn:comment:1', 'urn:comment:2'],
          },
        },
        included: [
          {
            id: 'testing1',
            type: 'com.example.bookstore.Book1',
            attributes: {
              $type: 'com.example.bookstore.Book1',
              name: `New name`,
              author: 'urn:author:1234',
              pubDate: 'April 2019',
              readerComments: ['urn:comment:1', 'urn:comment:2'],
            },
          },
        ],
      });

      this.store.push({
        data: {
          id: 'cake1',
          type: 'cake',
          attributes: {
            firstName: 'cake first',
            lastName: 'last',
            birthday: '1234',
          },
        },
      });
    },

    updateArray() {
      this.store.pushPayload('com.example.bookstore.ReaderComment', {
        data: {
          id: 'urn:comment:3',
          type: 'com.example.bookstore.Commenter',
          attributes: {
            commenter: {
              $type: 'com.example.bookstore.Commenter',
              name: 'Definitely a Different User',
              favouriteBook: 'isbn:9780760768570',
            },
            parts: [
              {
                value: 'I really enjoyed this book',
              },
              {
                value: `quite a lot ([${Math.random()}])`,
              },
              {
                value: 'although my favourite is still Volume Ⅰ.',
              },
            ],
          },
        },
      });
    },
  },
});
