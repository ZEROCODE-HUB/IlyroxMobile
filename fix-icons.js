const fs = require('fs');
const path = require('path');

const files = [
  'components/Appointments.tsx',
  'components/CreateProperty.tsx',
  'components/Feed.tsx',
  'components/MapSearch.tsx',
  'components/Matches.tsx',
  'components/Messaging.tsx',
  'components/Profile.tsx',
  'components/Statistics.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove stroke={...} props
  content = content.replace(/ stroke=\{[^}]+\}/g, '');
  content = content.replace(/ strokeXXXREMOVE=\{[^}]+\}/g, '');

  // Remove fill={...} props pero solo si no es "transparent"
  content = content.replace(/ fill=\{[^}]+\}/g, (match) => {
    if (match.includes('transparent')) {
      return match;
    }
    return '';
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${file}`);
});

console.log('All files fixed!');
