// Global app class
class App {
  constructor(bindto) {
    Object.assign(this, {
      ui: {
        bindto,
        stockQueryInput: '',
        newsQueryInput: {
          text: '',
          from: null,
          to: null
        },
        chart: {
          element: $('<div id="chart">').css('height', '320px'),
          c3: null
        },
      },
      queries: {
        stock: {
          current: null,
          pending: null,
        },
        news: {
          current: null,
          pending: null
        }
      },

      favs: Utils.autosave(JSON.parse(localStorage.getItem('favs')) || [], 'favs')
    });

    moment.locale("en-US");
  }

  submitStockQuery() {
    this.queries.stock.pending = new StockQuery(this.ui.stockQueryInput, this.update.bind(this));
  }

  submitNewsQuery() {
    let input = this.ui.newsQueryInput;

    this.queries.news.pending = new NewsQuery(input.text, input.from, input.to, this.update.bind(this));
  }

  update() {
    // Pending queries are moved to current if successful.
    let stock = this.queries.stock;
    if (stock.pending && stock.pending.success) {
      let isFirstDataset = stock.current === null;

      stock.current = stock.pending;
      stock.pending = null;

      // News query date range may need to be created/adjusted.
      let input = this.ui.newsQueryInput;
      
      if (isFirstDataset) {
        // The first time, we set from/to to the years of the dataset, Jan 1 to Dec 31.
        input.from = stock.current.from;
        input.from.setMonth(0);
        input.from.setDate(1);

        input.to = stock.current.to;
        input.to.setMonth(12);
        input.to.setDate(0);
      } else {
        // Every other time, we adjust years if they would fall outside the years of the dataset.
        // Months are left alone.
        input.from.setFullYear(Math.max(input.from.getFullYear(), stock.current.from.getFullYear()));
        input.to.setFullYear(Math.min(input.to.getFullYear(), stock.current.to.getFullYear()));
      }
    }

    let n = this.queries.news;
    if (n.pending && n.pending.success) {
      n.current = n.pending;
      n.pending = null;
    }

    this.render();
  }

  render() {
    let stock = this.queries.stock.current;
    let stockPending = this.queries.stock.pending;
    let news = this.queries.news.current;
    let newsPending = this.queries.news.pending;

    // Keeps `$($arg)` synced with `obj[prop]`. Otherwise forms would get cleared on every render.
    function $sync($arg, obj, prop) {
      return $($arg).val(obj[prop]).on('change', (e) => obj[prop] = $(e.currentTarget).val());
    }

    $(this.ui.bindto).empty().append(
      $("<div id='controls' class='card mb-2 px-2 pt-2'>").append(
        $("<form>")
          .on('submit', (e) => { e.preventDefault(); this.submitStockQuery() })
          .append(
            $("<div class='form-group row'>").append(
              $('<label for="stock-query" class="col-4 col-form-label text-right">').text("Symbol"),
              $('<div class="col-4">').append(
                $sync('<input type="text" id="stock-query" class="form-control" placeholder="e.g., MSFT...">', this.ui, 'stockQueryInput')),
              $('<div class="col-4 d-flex">').append(
                $('<input type="submit" class="btn btn-primary mr-2" value="Search">'),
                stockPending &&
                (stockPending.failure
                  ? $('<p class="error">').text("Sorry, data wasn't available for that stock.")
                  : $('<img class="loading" src="assets/images/loading.gif" alt="Loading...">'))))),

        $("<form>").addClass(!stock && 'disabled')
          .on('submit', (e) => { e.preventDefault(); this.queries.stock && this.submitNewsQuery() })
          .append(
            $("<div class='form-group row'>").append(
              $('<label for="stock-query" class="col-4 col-form-label text-right">').text("News"),
              $('<div class="col-4">').append(
                $sync(`<input type="text" id="stock-query" class="form-control" placeholder="Search NYT articles" ${stock ? '' : 'disabled'}>`, this.ui.newsQueryInput, 'text')),
              $('<div class="col-4 d-flex">').append(
                $('<input type="submit" class="btn btn-primary mr-2" value="Search">'),
                newsPending &&
                (newsPending.failure
                  ? $('<p class="error">').text("Sorry, something went wrong with the New York Times server.")
                  : $('<img class="loading" src="assets/images/loading.gif" alt="Loading...">'))))),

        $('<div class="form-group row">').append(
          $('<div class="col-12">').append(
            $('<input type="text" class="month slider">'),
            $('<input type="text" class="year slider">')))),

      stock &&
      $('<div class="card mb-2">').append(
        $('<div class="card-body">').append(
          $('<h2 class="card-title text-center mb-4">').text(stock.companyName),
          this.ui.chart.element)),

      news &&
      $('<div id="news" class="card">').append(
        $('<div class="card-body">').append(
          $('<h2 class="card-title text-center mb-4">News</h1>'),
          news.articles.map((article) =>
            $('<div class="article card mb-2">').append(
              $('<div class="card-body">').append(
                $(`<a class="card-title" href="${article.url}" target="_blank">`).append($('<h2>').html(article.headline)),
                $('<p>').text(moment(article.date).format('ddd, MMM Do YYYY')),
                $('<p>').html(article.snippet)))))));

    if (stock) {
      var ticks = [];
      let span = stock.to.getFullYear() - stock.from.getFullYear();
      for (let year = stock.from.getFullYear(); year <= stock.to.getFullYear(); year++) {
        let yearstr = '' + year;
        ticks.push(yearstr + '-01-01');

        if (10 >= span) {
          ticks.push(yearstr + '-04-01');
          ticks.push(yearstr + '-07-01');
          ticks.push(yearstr + '-10-01');
        }
      }

      let format = (span <= 20)
        ? (year) => year.getMonth() === 0 ? year.getFullYear() : ''
        : (year) => year.getFullYear() % 5 === 0 ? year.getFullYear() : '';

      this.ui.chart.c3 = c3.generate({
        bindto: this.ui.bindto + ' #chart',
        data: {
          xs: {
            'datasetValuesY': 'datasetDates',
            'datasetValuesY2': 'datasetDates'
          },
          columns: [
            ['datasetDates', ...stock.dataset.dates],
            ['datasetValuesY', ...stock.dataset.values],
            ['datasetValuesY2', ...stock.dataset.values]
          ],
          axes: {
            'datasetValuesY': 'y',
            'datasetValuesY2': 'y2'
          },
          hide: ['datasetValuesY2']
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              values: ticks,
              format: format,
              culling: false,
              outer: false
            },
          },
          y: {
            show: true,
            tick: {
              outer: false
            }
          },
          y2: {
            show: true,
            tick: {
              outer: false
            }
          }
        },
        legend: {
          show: false
        },
        point: {
          show: false
        }
      });
    }

    $('.month.slider').ionRangeSlider(stock
      ? {
        type: "double",
        grid: true,
        min: 1,
        max: 12,
        from: this.ui.newsQueryInput.from.getMonth(),
        to: this.ui.newsQueryInput.to.getMonth() + 1,
        step: 1,
        grid_snap: true,
        prettify: (date) => moment(date, 'MM.YYYY').format("MMM"),
        onChange: (data) => {
          this.ui.newsQueryInput.from.setMonth(data.from - 1);
          this.ui.newsQueryInput.to.setMonth(data.to);
          this.ui.newsQueryInput.to.setDate(0);
        }
      }
      : {
        disable: true,
        hide_min_max: true,
        hide_from_to: true
      });

    $('.year.slider').ionRangeSlider(stock
      ? {
        type: "double",
        grid: true,
        min: stock.from.getFullYear(),
        max: stock.to.getFullYear(),
        from: this.ui.newsQueryInput.from.getFullYear(),
        to: this.ui.newsQueryInput.to.getFullYear(),
        prettify_enabled: false,
        onChange: (data) => {
          this.ui.newsQueryInput.from.setFullYear(data.from);
          this.ui.newsQueryInput.to.setFullYear(data.to);
        }
      }
      : {
        disable: true,
        hide_min_max: true,
        hide_from_to: true
      });
  }
}