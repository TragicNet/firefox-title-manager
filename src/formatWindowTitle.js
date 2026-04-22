export default function formatWindowTitle(settings, userTitle) {
  const profileTitle = settings.profileTitle || '';
  const customTitle = userTitle || '';

  if (!profileTitle && !customTitle) {
    return '';
  }

  const separator = profileTitle && customTitle ? settings.profileSeparator : '';
  return `${settings.openingTag}${profileTitle}${separator}${customTitle}${settings.closingTag}`;
}
