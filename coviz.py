import json

import requests

from flask import Flask, render_template
import pandas as pd

app = Flask(__name__)

@app.route("/")
def index():
    url = "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv"
    r = requests.get(url, allow_redirects=True)
    filename = "covid_us_counties.csv"
    file = open(filename, 'wb')
    file.write(r.content)
    file.close()
    df = pd.read_csv(filename)
    df.dropna(inplace=True)
    covid_data = df.to_dict(orient='records')
    covid_data = json.dumps(covid_data, indent=2)
    data = {'covid_data': covid_data}
    return render_template("index.html", data=data)


if __name__ == "__main__":
    app.run(debug=True)