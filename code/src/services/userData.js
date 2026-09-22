import { getCurrentUserProfile, getUserCityById, listMyAchievements, mapApiProfileToState } from '@/api/authApi'
import { appState, updateUserProfile, setUserAchievements } from '@/store/appState'

export async function refreshUserData() {
  const userId = appState.user.id
  if (!appState.isAuthenticated || !userId) return
  const results = await Promise.allSettled([
    getCurrentUserProfile(), listMyAchievements(), getUserCityById(userId),
  ])
  if (!appState.isAuthenticated || appState.user.id !== userId) return
  if (results[0].status === 'fulfilled') updateUserProfile(mapApiProfileToState(results[0].value, appState.user))
  if (results[1].status === 'fulfilled') setUserAchievements(results[1].value)
  if (results[2].status === 'fulfilled') {
    const city = results[2].value
    updateUserProfile({ cityId: city.cityId > 0 ? city.cityId : null, city: city.cityName, region: city.regionName })
  }
  if (results.some(result => result.status === 'rejected')) throw new Error('Часть данных профиля не обновилась. Повторите загрузку.')
}
