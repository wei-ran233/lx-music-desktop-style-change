/**
 * useDjWeather — 天气感知 composable
 *
 * 封装天气获取、城市搜索、天气类型检测逻辑
 */

import { ref, computed } from '@common/utils/vueTools'
import { djSettings } from '@renderer/store/dj'
import { fetchCurrentWeather, searchCities } from '@renderer/utils/dj/weatherService'
import { detectWeatherType } from '@renderer/utils/dj/templateEngine'
import type { WeatherData, WeatherType, CitySearchResult } from '@renderer/utils/dj/types'

// 模块级单例天气状态（页面卸载后仍存活，供 DJ 自动连播跨页面使用）
const weatherData = ref<WeatherData>({
  city: '北京',
  weather: '晴',
  temp: '22°C',
  fullText: '北京 | 晴 22°C',
  type: 'sunny',
})
const isLoading = ref(false)
const error = ref<string | null>(null)

const city = computed(() => djSettings.city || '北京')
const weatherType = computed<WeatherType>(() => weatherData.value.type)
const weatherDisplay = computed(() => `${weatherData.value.weather} ${weatherData.value.temp}`)
const fullWeatherText = computed(() => weatherData.value.fullText)

export function useDjWeather() {
  /** 更新天气 */
  const refreshWeather = async() => {
    isLoading.value = true
    error.value = null
    try {
      const data = await fetchCurrentWeather()
      weatherData.value = {
        ...data,
        type: detectWeatherType(data.weather),
      }
    } catch (e) {
      error.value = '获取天气失败'
      console.error('天气获取失败:', e)
      // 使用 fallback
      const hours = new Date().getHours()
      const isNight = hours >= 19 || hours < 6
      weatherData.value = {
        city: city.value,
        weather: isNight ? '晴夜' : '晴',
        temp: '22°C',
        fullText: `${city.value} | ${isNight ? '晴夜' : '晴'} 22°C`,
        type: isNight ? 'night' : 'sunny',
      }
    } finally {
      isLoading.value = false
    }
  }

  /** 搜索城市 */
  const searchCity = async(keyword: string): Promise<CitySearchResult[]> => {
    if (!keyword.trim()) return []
    try {
      return await searchCities(keyword)
    } catch {
      return []
    }
  }

  return {
    weatherData,
    isLoading,
    error,
    city,
    weatherType,
    weatherDisplay,
    fullWeatherText,
    refreshWeather,
    searchCity,
  }
}
