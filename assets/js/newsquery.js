class NewsQuery {
  constructor(query, from, to, update) {
    this.response = null;
    
    function format(date) {
      let iso = date.toISOString();

      return iso.split('T')[0].replace(/-/g, ''); // YYYY-MM-DDT... -> YYYYMMDD
    }

    let proxy = Utils.observe(this, update);

    $.ajax({
      url: 'https://api.nytimes.com/svc/search/v2/articlesearch.json',
      data: {
        'api-key': '33d24445c695491bb4645a00e949c71f',
        'q': query,
        'fq': 'news_desk:("Business" "Business Day" "Financial" "Your Money" )',
        'begin_date': format(from),
        'end_date': format(to),
        'fl': "headline,snippet,web_url,pub_date,news_desk"
      }
    }).always(Utils.receiveAt(proxy, 'response'));

    return proxy;
  }

  get success() {
    return this.response && this.response.statusText === 'OK';
  }

  get failure() {
    return this.response && this.response.statusText !== 'OK';
  }

  get articles() {
    if (this.success) {
      let articles = this.response.responseJSON.response.docs.map(doc => Object({
        headline: doc.headline.main,
        snippet: doc.snippet,
        url: doc.web_url,
        date: doc.pub_date
      }));

      Utils.memoize(this, { articles });
      return articles;
    } else return null;
  }
}