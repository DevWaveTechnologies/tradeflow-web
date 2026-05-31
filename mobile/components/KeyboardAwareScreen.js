import { forwardRef, useEffect, useState } from 'react'
import { Keyboard, Platform, ScrollView, StyleSheet } from 'react-native'

const KeyboardAwareScreen = forwardRef(function KeyboardAwareScreen(
  { children, contentContainerStyle, style },
  ref,
) {
  const [keyboardPadding, setKeyboardPadding] = useState(0)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onShow = (event) => setKeyboardPadding(event.endCoordinates.height + 72)
    const onHide = () => setKeyboardPadding(0)

    const showSub = Keyboard.addListener(showEvent, onShow)
    const hideSub = Keyboard.addListener(hideEvent, onHide)

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return (
    <ScrollView
      ref={ref}
      style={[styles.flex, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(32, keyboardPadding) },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
})

export default KeyboardAwareScreen

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
})
