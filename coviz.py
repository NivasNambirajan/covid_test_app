import json

import requests

from flask import Flask, render_template
import pandas as pd

app = Flask(__name__)

@app.route("/")
def index():
    #Read COVID data
    url = "https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv"
    r = requests.get(url, allow_redirects=True)
    filename = "covid_us_counties.csv"
    file = open(filename, 'wb')
    file.write(r.content)
    file.close()
    covid_df = pd.read_csv(filename)
    covid_df.loc[covid_df["county"]=="New York City", "fips"] = 7777777.0
    covid_df.dropna(inplace=True)
    covid_data = covid_df.to_dict(orient='records')
    covid_data = json.dumps(covid_data, indent=2)
    
    
    #Read population data
    filename = "pop_us_counties.csv"
    df = pd.read_csv(filename, engine="python", usecols=['STNAME', 'CTYNAME', 'POPESTIMATE2019'])
    
    #Take care of New York City
    nyc_counties = ["Bronx County", "Kings County", "Queens County", "Richmond County", "New York County"]
    df.loc[df["STNAME"]=="New York", ["CTYNAME"]] = df.loc[df["STNAME"]=="New York", ["CTYNAME"]].replace(nyc_counties, "New York City County")
    df.loc[(df['STNAME']=="New York")&(df['CTYNAME']=="New York City County"), "POPESTIMATE2019"] = df.loc[(df['STNAME']=="New York")&(df['CTYNAME']=="New York City County"), ["CTYNAME", "POPESTIMATE2019"]].groupby("CTYNAME", as_index=False).sum()["POPESTIMATE2019"].max()
    
    #The US census reports statewide data using the state itself as a countyname, so take this out
    df_counties = df[df['STNAME']!=df["CTYNAME"]].reset_index(drop=True)
    
    #Remove "city", "county", "parish" and such from the name
    #Better way to do this. CONSIDER UPGRADING
    df_counties["CTYNAME"] = [" ".join(name.split(" ")[:-1]) for name in df_counties["CTYNAME"].values]
    df_counties.rename(columns={'CTYNAME':'county', 'STNAME':'state', 'POPESTIMATE2019':'population'}, inplace=True)
    col_subset = ['state', 'county', 'population']
    df_counties = df_counties[col_subset]
    
    #Once "county" and "city" is removed, some names overlap. Assume county always has a greater pop than any other demarcation
    df_counties = df_counties.groupby(['state', 'county']).max()['population'].reset_index()
    
    #Take only those counties for which we have COVID data, with FIPS
    df_counties = pd.merge(covid_df[['state', 'county', 'fips']].drop_duplicates(keep='first'), df_counties, on=['state', 'county'], how="left")
    df_counties = df_counties[['fips', 'population']]
    pop_data = df_counties.to_dict(orient='records')
    pop_data = json.dumps(pop_data, indent=2)
    
    
    
    #Now ready both COVID and population data for html
    data = {'covid_data': covid_data, 'pop_data': pop_data}
    return render_template("index.html", data=data)


if __name__ == "__main__":
    app.run(debug=True)