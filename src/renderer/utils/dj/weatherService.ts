import { djSettings } from '@renderer/store/dj'

export interface WeatherData {
  city: string
  weather: string
  temp: string
  feelsLike?: string
  windDir?: string
  fullText: string
}

export interface CitySearchResult {
  id: string
  name: string
  adm1: string
  adm2: string
  country: string
  displayLabel: string
}

/**
 * 城市模糊搜索 (和风 GeoAPI 城市 Lookup)
 */
export const searchCities = async(keyword: string): Promise<CitySearchResult[]> => {
  const trimKw = keyword.trim()
  if (!trimKw) return []

  const apiKey = djSettings.weatherApiKey
  if (apiKey) {
    try {
      const url = `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(trimKw)}&key=${apiKey}&range=cn&number=10`
      const res = await fetch(url)
      const data = await res.json()

      if (data.code === '200' && Array.isArray(data.location)) {
        return data.location.map((item: any) => {
          const adm1 = item.adm1 || ''
          const adm2 = item.adm2 || ''
          const country = item.country || '中国'
          const regionStr = [adm2, adm1].filter(Boolean).join(' · ')
          const displayLabel = regionStr ? `${item.name} (${regionStr} · ${country})` : `${item.name} (${country})`

          return {
            id: item.id,
            name: item.name,
            adm1,
            adm2,
            country,
            displayLabel,
          }
        })
      }
    } catch (err) {
      console.error('和风 GeoAPI 城市搜索失败:', err)
    }
  }

  // 预设热门城市供无 Key 时检索
  const popular = [
    { id: '101010100', name: '北京', adm1: '北京市', adm2: '北京', country: '中国', displayLabel: '北京 (北京市 · 中国)' },
    { id: '101020100', name: '上海', adm1: '上海市', adm2: '上海', country: '中国', displayLabel: '上海 (上海市 · 中国)' },
    { id: '101280101', name: '广州', adm1: '广东省', adm2: '广州', country: '中国', displayLabel: '广州 (广东省 · 中国)' },
    { id: '101280601', name: '深圳', adm1: '广东省', adm2: '深圳', country: '中国', displayLabel: '深圳 (广东省 · 中国)' },
    { id: '101270101', name: '成都', adm1: '四川省', adm2: '成都', country: '中国', displayLabel: '成都 (四川省 · 中国)' },
    { id: '101210101', name: '杭州', adm1: '浙江省', adm2: '杭州', country: '中国', displayLabel: '杭州 (浙江省 · 中国)' },
    { id: '101110101', name: '西安', adm1: '陕西省', adm2: '西安', country: '中国', displayLabel: '西安 (陕西省 · 中国)' },
    { id: '101200101', name: '武汉', adm1: '湖北省', adm2: '武汉', country: '中国', displayLabel: '武汉 (湖北省 · 中国)' },
  ]
  return popular.filter(c => c.name.includes(trimKw) || c.displayLabel.includes(trimKw))
}

/**
 * 实时获取当前城市天气
 * 支持和风天气 API 以及免费实测 API 自动查询
 */
export const fetchCurrentWeather = async(): Promise<WeatherData> => {
  const city = djSettings.city || '成都'
  const apiKey = djSettings.weatherApiKey

  // 1. 如果配置了和风天气 API Key，调用官方接口
  if (apiKey) {
    try {
      const geoRes = await fetch(
        `https://geoapi.qweather.com/v2/city/lookup?location=${encodeURIComponent(city)}&key=${apiKey}`,
      )
      const geoData = await geoRes.json()

      if (geoData.code === '200' && geoData.location?.[0]?.id) {
        const locationId = geoData.location[0].id
        const cityName = geoData.location[0].name || city

        const weatherRes = await fetch(
          `https://devapi.qweather.com/v7/weather/now?location=${locationId}&key=${apiKey}`,
        )
        const weatherData = await weatherRes.json()

        if (weatherData.code === '200' && weatherData.now) {
          const now = weatherData.now
          const weatherText = now.text
          const tempText = `${now.temp}°C`

          return {
            city: cityName,
            weather: weatherText,
            temp: tempText,
            feelsLike: `${now.feelsLike}°C`,
            windDir: `${now.windDir} ${now.windScale}级`,
            fullText: `${cityName} | ${weatherText} ${tempText}`,
          }
        }
      }
    } catch (err) {
      console.error('和风天气 API 请求失败:', err)
    }
  }

  // 2. 自动免费实时天气接口 Lookup (免 Key 真实天气查询)
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
    const data = await res.json()
    const current = data.current_condition?.[0]
    if (current) {
      const tempC = `${current.temp_C}°C`
      const weatherDesc = current.lang_zh?.[0]?.value || current.weatherDesc?.[0]?.value || '晴'
      return {
        city,
        weather: weatherDesc,
        temp: tempC,
        fullText: `${city} | ${weatherDesc} ${tempC}`,
      }
    }
  } catch (err) {
    console.warn('wttr.in 免 Key 接口请求失败, 使用时间段自适应:', err)
  }

  // 3. 时间段+天气自适应 Fallback
  const hours = new Date().getHours()
  const isNight = hours >= 19 || hours < 6
  return {
    city,
    weather: isNight ? '晴夜' : '晴',
    temp: '22°C',
    fullText: `${city} | ${isNight ? '晴夜' : '晴'} 22°C`,
  }
}
