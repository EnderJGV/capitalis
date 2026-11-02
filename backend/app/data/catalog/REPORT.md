# Catálogo mundial de instituciones financieras

Generado el 2026-11-02 con `python -m scripts.catalog.build`.

## Resumen

- **18,572 instituciones** en **211 países/territorios** (de 256 con código ISO).
- Con dominio (logo real): 7,200 (38 %). Las demás usan monograma.
- Por tipo: bank 17,471, cooperative 362, digital 348, broker 284, exchange 107
- Registros leídos de las fuentes: 19,857; unidos a marcas curadas: 438; marcas curadas: 781.
- Monedas: 151 (151 con cotización disponible).

## Fuentes

| Fuente | Licencia | Uso |
|---|---|---|
| Wikidata | CC0 | Bancos de todos los países, cooperativas, corretoras, neobancos, pagos y exchanges; popularidad por artículos de Wikipedia |
| FDIC BankFind | Dominio público | Todos los bancos activos de EE. UU. con sitio web y activos |
| BrasilAPI (lista del Banco Central do Brasil) | Datos públicos | Bancos, IP, SCD, DTVM y corretoras de Brasil |
| Curaduría (`curated/brands.py`) | Propia | Nombre comercial, dominio, color y orden de las instituciones más usadas |

No se usaron: NCUA (bloquea descargas automáticas, HTTP 403), lista de broker-dealers de la SEC (exige un e-mail de
contacto real; además son mayormente institucionales) ni el registro de la EBA (descarga no automatizable).

## Países foco

| País | Total | Bancos | Digitales | Corretoras | Cooperativas | Exchanges | Top 5 |
|---|---|---|---|---|---|---|---|
| BR | 542 | 262 | 163 | 86 | 28 | 3 | Nubank, Itaú, Banco do Brasil, Caixa, Bradesco |
| MX | 49 | 27 | 11 | 9 | 1 | 1 | BBVA México, Banorte, Santander México, Banamex, Nu México |
| VE | 33 | 30 | 2 | 1 | 0 | 0 | Banco de Venezuela, Banesco, Mercantil, BBVA Provincial, BNC |
| CO | 39 | 23 | 8 | 6 | 2 | 0 | Bancolombia, Davivienda, Nequi, Banco de Bogotá, BBVA Colombia |
| AR | 53 | 32 | 7 | 8 | 2 | 4 | Banco Nación, Galicia, Santander Argentina, Mercado Pago Argentina, BBVA Argentina |
| CL | 31 | 19 | 3 | 7 | 1 | 1 | BancoEstado, Banco de Chile, Santander Chile, BCI, Scotiabank Chile |
| PE | 29 | 24 | 2 | 2 | 0 | 1 | BCP, Interbank, BBVA Perú, Yape, Scotiabank Perú |
| EC | 21 | 14 | 1 | 0 | 6 | 0 | Banco Pichincha, Banco Guayaquil, Produbanco, Banco del Pacífico, Banco Bolivariano |
| UY | 23 | 18 | 3 | 1 | 1 | 0 | BROU, Itaú Uruguay, Santander Uruguay, BBVA Uruguay, Scotiabank Uruguay |
| PY | 14 | 11 | 3 | 0 | 0 | 0 | Itaú Paraguay, Banco Continental, ueno bank, Banco Basa, Banco GNB Paraguay |
| BO | 15 | 14 | 1 | 0 | 0 | 0 | Banco Nacional de Bolivia, Banco Mercantil Santa Cruz, Banco Unión, BCP Bolivia, Banco BISA |
| PA | 12 | 10 | 1 | 0 | 0 | 1 | Banco General, Banistmo, BAC Panamá, Banco Nacional de Panamá, Caja de Ahorros |
| CR | 13 | 11 | 0 | 0 | 2 | 0 | Banco Nacional de Costa Rica, Banco de Costa Rica, BAC Costa Rica, Banco Popular, Davivienda Costa Rica |
| GT | 11 | 10 | 1 | 0 | 0 | 0 | Banco Industrial, Banrural, BAC Guatemala, G&T Continental, BAM |
| HN | 13 | 12 | 1 | 0 | 0 | 0 | Banco Atlántida, Ficohsa, BAC Honduras, Banpaís, Banco de Occidente Honduras |
| SV | 11 | 9 | 2 | 0 | 0 | 0 | Banco Agrícola, Banco Cuscatlán, Davivienda El Salvador, BAC El Salvador, Banco Hipotecario |
| NI | 8 | 8 | 0 | 0 | 0 | 0 | Banco LAFISE, Banpro, BAC Nicaragua, BDF, Ficohsa Nicaragua |
| DO | 17 | 13 | 2 | 0 | 2 | 0 | Banco Popular Dominicano, Banreservas, BHD, Scotiabank República Dominicana, Banco Santa Cruz |
| CU | 4 | 4 | 0 | 0 | 0 | 0 | BANDEC, Banco Popular de Ahorro, Banco Metropolitano, Metropolitan Bank |
| PR | 4 | 3 | 1 | 0 | 0 | 0 | Banco Popular de Puerto Rico, FirstBank Puerto Rico, Oriental, ATH Móvil |
| US | 3964 | 3885 | 12 | 33 | 29 | 5 | Chase, Bank of America, Wells Fargo, Citi, Capital One |
| CA | 56 | 32 | 3 | 6 | 13 | 2 | RBC Royal Bank, TD Canada Trust, Scotiabank, BMO, CIBC |
| ES | 140 | 125 | 5 | 4 | 4 | 2 | Santander, BBVA, CaixaBank, Banco Sabadell, Bankinter |
| PT | 28 | 23 | 3 | 1 | 1 | 0 | Caixa Geral de Depósitos, Millennium bcp, novobanco, Santander Portugal, BPI |
| GB | 165 | 134 | 6 | 14 | 7 | 4 | Barclays, HSBC UK, Lloyds Bank, NatWest, Santander UK |
| DE | 758 | 601 | 3 | 5 | 149 | 0 | N26, Deutsche Bank, Commerzbank, Sparkasse, Volksbank / Raiffeisenbank |
| FR | 62 | 57 | 2 | 1 | 1 | 1 | BNP Paribas, Société Générale, Crédit Agricole, LCL, La Banque Postale |
| IT | 96 | 89 | 3 | 1 | 1 | 2 | Intesa Sanpaolo, UniCredit, Fineco, BPER Banca, Banco BPM |
| INTL | 139 | 1 | 38 | 35 | 16 | 49 | Wise, Payoneer, PayPal, Revolut, Skrill |

## Todos los países

| Código | País | Moneda | Instituciones |
|---|---|---|---|
| IN | India | INR | 9533 |
| US | United States | USD | 3964 |
| DE | Germany | EUR | 758 |
| BR | Brazil | BRL | 542 |
| NG | Nigeria | NGN | 195 |
| GB | United Kingdom | GBP | 165 |
| ES | Spain | EUR | 140 |
| INTL | International | USD | 139 |
| CH | Switzerland | CHF | 131 |
| JP | Japan | JPY | 127 |
| IT | Italy | EUR | 96 |
| RU | Russia | RUB | 88 |
| NO | Norway | NOK | 85 |
| ID | Indonesia | IDR | 81 |
| SE | Sweden | SEK | 80 |
| TG | Togo | XOF | 76 |
| TW | Taiwan | TWD | 75 |
| PL | Poland | PLN | 70 |
| CZ | Czech Republic | CZK | 69 |
| AT | Austria | EUR | 67 |
| CN | People's Republic of China | CNY | 64 |
| DK | Denmark | DKK | 63 |
| FR | France | EUR | 62 |
| UA | Ukraine | UAH | 57 |
| CA | Canada | CAD | 56 |
| FI | Finland | EUR | 56 |
| AR | Argentina | ARS | 53 |
| MX | Mexico | MXN | 49 |
| TR | Turkey | TRY | 49 |
| AU | Australia | AUD | 46 |
| BD | Bangladesh | BDT | 42 |
| BE | Belgium | EUR | 39 |
| CO | Colombia | COP | 39 |
| UZ | Uzbekistan | UZS | 37 |
| GH | Ghana | GHS | 35 |
| LV | Latvia | EUR | 33 |
| VE | Venezuela | VES | 33 |
| CL | Chile | CLP | 31 |
| PE | Peru | PEN | 29 |
| PT | Portugal | EUR | 28 |
| BY | Belarus | BYN | 25 |
| KR | South Korea | KRW | 25 |
| VN | Vietnam | VND | 25 |
| RO | Romania | RON | 24 |
| IR | Iran | IRR | 23 |
| KE | Kenya | KES | 23 |
| NP | Nepal | NPR | 23 |
| PH | Philippines | PHP | 23 |
| UY | Uruguay | UYU | 23 |
| LU | Luxembourg | EUR | 22 |
| EC | Ecuador | USD | 21 |
| EG | Egypt | EGP | 21 |
| ZA | South Africa | ZAR | 20 |
| TN | Tunisia | TND | 19 |
| HU | Hungary | HUF | 18 |
| LB | Lebanon | LBP | 18 |
| BG | Bulgaria | EUR | 17 |
| DO | Dominican Republic | DOP | 17 |
| HR | Croatia | EUR | 17 |
| LT | Lithuania | EUR | 17 |
| BO | Bolivia | BOB | 15 |
| EE | Estonia | EUR | 15 |
| GR | Greece | EUR | 14 |
| KZ | Kazakhstan | KZT | 14 |
| PY | Paraguay | PYG | 14 |
| AZ | Azerbaijan | AZN | 13 |
| CR | Costa Rica | CRC | 13 |
| HN | Honduras | HNL | 13 |
| NZ | New Zealand | NZD | 13 |
| PA | Panama | USD | 12 |
| SG | Singapore | SGD | 12 |
| SK | Slovakia | EUR | 12 |
| AM | Armenia | AMD | 11 |
| GT | Guatemala | GTQ | 11 |
| MY | Malaysia | MYR | 11 |
| RS | Serbia | RSD | 11 |
| SV | El Salvador | USD | 11 |
| SY | Syria | SYP | 10 |
| AE | United Arab Emirates | AED | 9 |
| AL | Albania | ALL | 9 |
| AO | Angola | AOA | 9 |
| HT | Haiti | HTG | 9 |
| IL | Israel | ILS | 9 |
| LK | Sri Lanka | LKR | 9 |
| MK | North Macedonia | MKD | 9 |
| SI | Slovenia | EUR | 9 |
| SR | Suriname | SRD | 9 |
| IE | Ireland | EUR | 8 |
| NI | Nicaragua | NIO | 8 |
| NL | Kingdom of the Netherlands | AWG | 8 |
| SA | Saudi Arabia | SAR | 8 |
| ZW | Zimbabwe | ZWG | 8 |
| BH | Bahrain | BHD | 7 |
| CM | Cameroon | XAF | 7 |
| GE | Georgia | GEL | 7 |
| HK | Hong Kong | HKD | 7 |
| JM | Jamaica | JMD | 7 |
| JO | Jordan | JOD | 7 |
| MA | Morocco | MAD | 7 |
| MD | Moldova | MDL | 7 |
| MT | Malta | EUR | 7 |
| PK | Pakistan | PKR | 7 |
| SD | Sudan | SDG | 7 |
| SN | Senegal | XOF | 7 |
| TH | Thailand | THB | 7 |
| BS | The Bahamas | BSD | 6 |
| CI | Ivory Coast | XOF | 6 |
| CY | Cyprus | EUR | 6 |
| ET | Ethiopia | ETB | 6 |
| IQ | Iraq | IQD | 6 |
| MU | Mauritius | MUR | 6 |
| MZ | Mozambique | MZN | 6 |
| NE | Niger | XOF | 6 |
| PS | Palestine | ILS | 6 |
| TM | Turkmenistan | TMT | 6 |
| UG | Uganda | UGX | 6 |
| ZM | Zambia | ZMW | 6 |
| BA | Bosnia and Herzegovina | BAM | 5 |
| BB | Barbados | BBD | 5 |
| KG | Kyrgyzstan | KGS | 5 |
| KH | Cambodia | KHR | 5 |
| ME | Montenegro | EUR | 5 |
| MN | Mongolia | MNT | 5 |
| TJ | Tajikistan | TJS | 5 |
| TT | Trinidad and Tobago | TTD | 5 |
| YE | Yemen | YER | 5 |
| AD | Andorra | EUR | 4 |
| BF | Burkina Faso | XOF | 4 |
| BW | Botswana | BWP | 4 |
| BZ | Belize | BZD | 4 |
| CD | Democratic Republic of the Congo | CDF | 4 |
| CU | Cuba | CUP | 4 |
| CV | Cape Verde | CVE | 4 |
| FJ | Fiji | FJD | 4 |
| GY | Guyana | GYD | 4 |
| KW | Kuwait | KWD | 4 |
| LY | Libya | LYD | 4 |
| NA | Namibia | NAD | 4 |
| OM | Oman | OMR | 4 |
| PR | Puerto Rico | USD | 4 |
| TZ | Tanzania | TZS | 4 |
| AF | Afghanistan | AFN | 3 |
| AG | Antigua and Barbuda | XCD | 3 |
| AW | Aruba | AWG | 3 |
| BI | Burundi | BIF | 3 |
| BJ | Benin | XOF | 3 |
| BM | Bermuda | BMD | 3 |
| CW | Curaçao | ANG | 3 |
| DZ | Algeria | DZD | 3 |
| FO | Faroe Islands | DKK | 3 |
| GA | Gabon | XAF | 3 |
| IS | Iceland | ISK | 3 |
| KP | North Korea | KPW | 3 |
| KY | Cayman Islands | KYD | 3 |
| LA | Laos | LAK | 3 |
| LI | Liechtenstein | CHF | 3 |
| LR | Liberia | LRD | 3 |
| LS | Lesotho | LSL | 3 |
| MC | Monaco | EUR | 3 |
| MG | Madagascar | MGA | 3 |
| ML | Mali | XOF | 3 |
| MM | Myanmar | MMK | 3 |
| MO | Macau | MOP | 3 |
| MW | Malawi | MWK | 3 |
| PG | Papua New Guinea | PGK | 3 |
| QA | Qatar | QAR | 3 |
| SM | San Marino | EUR | 3 |
| SO | Somalia | SOS | 3 |
| ST | São Tomé and Príncipe | STN | 3 |
| SZ | Eswatini | SZL | 3 |
| TL | Timor-Leste | USD | 3 |
| XK | Kosovo | EUR | 3 |
| BN | Brunei | BND | 2 |
| BT | Bhutan | BTN | 2 |
| CG | Republic of the Congo | XAF | 2 |
| DJ | Djibouti | DJF | 2 |
| ER | Eritrea | ERN | 2 |
| GD | Grenada | XCD | 2 |
| GM | The Gambia | GMD | 2 |
| GN | Guinea | GNF | 2 |
| GQ | Equatorial Guinea | XAF | 2 |
| GW | Guinea-Bissau | XOF | 2 |
| MR | Mauritania | MRU | 2 |
| MV | Maldives | MVR | 2 |
| PF | French Polynesia | XPF | 2 |
| RW | Rwanda | RWF | 2 |
| SB | Solomon Islands | SBD | 2 |
| SC | Seychelles | SCR | 2 |
| SL | Sierra Leone | SLE | 2 |
| SS | South Sudan | SSP | 2 |
| TD | Chad | XAF | 2 |
| TO | Tonga | TOP | 2 |
| VC | Saint Vincent and the Grenadines | XCD | 2 |
| VU | Vanuatu | VUV | 2 |
| WS | Samoa | WST | 2 |
| AI | Anguilla | XCD | 1 |
| CF | Central African Republic | XAF | 1 |
| DM | Dominica | XCD | 1 |
| FM | Federated States of Micronesia | USD | 1 |
| GI | Gibraltar | GIP | 1 |
| IM | Isle of Man | GBP | 1 |
| JE | Jersey | GBP | 1 |
| KI | Kiribati | AUD | 1 |
| KM | Comoros | KMF | 1 |
| KN | Saint Kitts and Nevis | XCD | 1 |
| LC | Saint Lucia | XCD | 1 |
| MH | Marshall Islands | USD | 1 |
| NC | New Caledonia | XPF | 1 |
| NR | Nauru | AUD | 1 |
| PW | Palau | USD | 1 |
| TV | Tuvalu | AUD | 1 |
| AC | Ascension | — | 0 |
| AQ | Antarctic Treaty area | — | 0 |
| AS | American Samoa | USD | 0 |
| AX | Åland | EUR | 0 |
| BL | Saint Barthélemy | EUR | 0 |
| BQ | Caribbean Netherlands | USD | 0 |
| BV | Bouvet Island | — | 0 |
| CC | Cocos (Keeling) Islands | AUD | 0 |
| CK | Cook Islands | NZD | 0 |
| CP | Clipperton Island | — | 0 |
| CQ | Sark | — | 0 |
| CX | Christmas Island | AUD | 0 |
| DG | Diego Garcia | — | 0 |
| EH | Western Sahara | MAD | 0 |
| FK | Falkland Islands | FKP | 0 |
| GF | French Guiana | EUR | 0 |
| GG | Guernsey | GBP | 0 |
| GL | Greenland | DKK | 0 |
| GP | Guadeloupe | EUR | 0 |
| GS | South Georgia and the South Sandwich Islands | GBP | 0 |
| GU | Guam | USD | 0 |
| HM | Heard Island and McDonald Islands | — | 0 |
| IO | British Indian Ocean Territory | GBP | 0 |
| MF | Saint-Martin | EUR | 0 |
| MP | Northern Mariana Islands | USD | 0 |
| MQ | Martinique | EUR | 0 |
| MS | Montserrat | XCD | 0 |
| NF | Norfolk Island | AUD | 0 |
| NU | Niue | NZD | 0 |
| PM | Saint Pierre and Miquelon | EUR | 0 |
| PN | Pitcairn Islands | NZD | 0 |
| RE | Réunion | EUR | 0 |
| SH | Saint Helena, Ascension and Tristan da Cunha | GBP | 0 |
| SJ | Svalbard and Jan Mayen | NOK | 0 |
| SX | Sint Maarten | ANG | 0 |
| TA | Tristan da Cunha | GBP | 0 |
| TC | Turks and Caicos Islands | USD | 0 |
| TF | French Southern and Antarctic Lands | EUR | 0 |
| TK | Tokelau | NZD | 0 |
| UM | United States Minor Outlying Islands | USD | 0 |
| VA | Vatican City | EUR | 0 |
| VG | British Virgin Islands | USD | 0 |
| VI | United States Virgin Islands | USD | 0 |
| WF | Wallis and Futuna | XPF | 0 |
| YT | Mayotte | EUR | 0 |

## Países con poca cobertura (< 3): 84

AC, AI, AQ, AS, AX, BL, BN, BQ, BT, BV, CC, CF, CG, CK, CP, CQ, CX, DG, DJ, DM, EH, ER, FK, FM, GD, GF, GG, GI, GL, GM, GN, GP, GQ, GS, GU, GW, HM, IM, IO, JE, KI, KM, KN, LC, MF, MH, MP, MQ, MR, MS, MV, NC, NF, NR, NU, PF, PM, PN, PW, RE, RW, SB, SC, SH, SJ, SL, SS, SX, TA, TC, TD, TF, TK, TO, TV, UM, VA, VC, VG, VI, VU, WF, WS, YT
