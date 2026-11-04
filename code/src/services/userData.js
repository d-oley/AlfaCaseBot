import { getCurrentUserProfile, getUserCityById, listMyAchievements, mapApiProfileToState } from '@/api/authApi'
import { appState, updateUserProfile, setUserAchievements } from '@/store/appState'

export async function refreshUserData() {
  const userId = appState.user.id
  if (!appState.isAuthenticated || !userId) return
  const [profileResult, achievementsResult, cityResult] = await Promise.allSettled([getCurrentUserProfile(), listMyAchievements(), getUserCityById(userId)])

  // пока шли запросы, пользователь мог выйти или сменить аккаунт
  if (!appState.isAuthenticated || appState.user.id !== userId) return

  if (profileResult.status === 'fulfilled') {
    const profile = mapApiProfileToState(profileResult.value, appState.user)
    updateUserProfile(profile)
  }
  if (achievementsResult.status === 'fulfilled') {
    setUserAchievements(achievementsResult.value)
  }
  if (cityResult.status === 'fulfilled') {
    const city = cityResult.value
   updateUserProfile({ cityId: city.cityId > 0 ? city.cityId : null, city: city.cityName, region: city.regionName })
  }

  if (profileResult.status === 'rejected' || achievementsResult.status === 'rejected' || cityResult.status === 'rejected') {
    throw new Error('Часть данных профиля не обновилась. Повторите загрузку.')
  }
}
