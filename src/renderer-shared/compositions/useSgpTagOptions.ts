import { useTranslation } from 'i18next-vue'
import { computed } from 'vue'

export function useSgpTagOptions() {
  const { t } = useTranslation()

  return computed(() => {
    return [
      {
        label: t('sgpMatchHistoryTags.all', { ns: 'common' }),
        value: 'all'
      },
      {
        label: t('sgpMatchHistoryTags.q_420', { ns: 'common' }),
        value: `q_420`
      },
      {
        label: t('sgpMatchHistoryTags.q_430', { ns: 'common' }),
        value: `q_430`
      },
      {
        label: t('sgpMatchHistoryTags.q_440', { ns: 'common' }),
        value: `q_440`
      },
      {
        label: t('sgpMatchHistoryTags.q_450', { ns: 'common' }),
        value: `q_450`
      },
      {
        label: t('sgpMatchHistoryTags.q_480', { ns: 'common' }),
        value: `q_480`
      },
      {
        label: t('sgpMatchHistoryTags.q_1700', { ns: 'common' }),
        value: 'q_1700'
      },
      {
        label: t('sgpMatchHistoryTags.q_490', { ns: 'common' }),
        value: `q_490`
      },
      {
        label: t('sgpMatchHistoryTags.q_1900', { ns: 'common' }),
        value: `q_1900`
      },
      {
        label: t('sgpMatchHistoryTags.q_900', { ns: 'common' }),
        value: `q_900`
      },
      {
        label: t('sgpMatchHistoryTags.q_2300', { ns: 'common' }),
        value: `q_2300`
      }
    ]
  })
}
