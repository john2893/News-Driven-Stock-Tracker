class StockQuery {
  constructor(symbol, update) {
    this.response = Utils.observe({
      data: null,
      metadata: null,
    }, update);

    // Send requests
    $.ajax({
      method: 'GET',
      url: 'https://www.quandl.com/api/v3/datasets/WIKI/' + symbol + '/data.json',
      data: {
        api_key: 'UgyTCPiRsSybMnmGJJKA'
      }
    }).always(Utils.receiveAt(this.response, 'data'));

    $.ajax({
      method: 'GET',
      url: 'https://www.quandl.com/api/v3/datasets/WIKI/' + symbol + '/metadata.json',
      data: {
        api_key: 'UgyTCPiRsSybMnmGJJKA'
      }
    }).always(Utils.receiveAt(this.response, 'metadata'));
  }

  get success() {
    let d = this.response.data && this.response.data.statusText === 'success';
    let m = this.response.metadata && this.response.metadata.statusText === 'success';

    if (d && m) // Both data and metadata requests succeeded
      return true;
    else if (d === false || m === false) // At least one request failed
      return false;
    else return null; // Neither failed and at least one is still pending
  }

  get failure() {
    let s = this.success;

    if (s === true)
      return false
    else if (s === false)
      return true
    else return null;
  }

  get companyName() {
    if (this.success) {
      let namePlusJunk = this.response.metadata.responseJSON.dataset.name;
      let companyName = namePlusJunk.match(/(.*?) \(/)[1]; // Extract the prefix before the first ' ('

      Utils.memoize(this, { companyName })
      return companyName;
    } else return null;
  }

  get dataset() {
    if (this.success) {
      let d = this.response.data.responseJSON.dataset_data;
      let valIndex = d.column_names.indexOf('Adj. Close');
      let dataset = {
        dates: d.data.map(datum => datum[0]),
        values: d.data.map(datum => datum[valIndex])
      };

      Utils.memoize(this, { dataset })
      return dataset;
    } else return null;
  }

  get from() {
    return this.success && new Date(this.response.metadata.responseJSON.dataset.oldest_available_date);
  }

  get to() {
    return this.success && new Date(this.response.metadata.responseJSON.dataset.newest_available_date);
  }
}