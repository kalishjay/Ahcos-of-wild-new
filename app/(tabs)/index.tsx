import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ImageBackground,
  TextInput, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { COLORS, FONTS, ROUNDING, SIZES } from '../../constants/theme';
import { Bell, Search, Scan, Compass, Box, Sparkles } from 'lucide-react-native';
import { IconPillButton } from '../../components/ui/IconPillButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { SpeciesCard } from '../../components/SpeciesCard';
import { NewsListItem } from '../../components/NewsListItem';
import speciesData from '../../data/species.json';
import newsData from '../../data/news.json';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');

  const isSearching = searchText.trim().length > 0;

  const displayedSpecies = useMemo(() => {
    if (!isSearching) return speciesData.slice(0, 3);
    const q = searchText.trim().toLowerCase();
    return speciesData.filter(
      s =>
        s.commonName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q) ||
        s.mainHabitat.toLowerCase().includes(q),
    );
  }, [searchText, isSearching]);

  return (
    <ScrollView style={styles.container} bounces={false}>
      {/* ── Adventure & Museum Hero ────────────────────────────────────────── */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={{ uri: speciesData[0].imageUrls.hero }}
          style={styles.heroImage}
        >
          <View style={[styles.heroOverlay, { paddingTop: Math.max(insets.top + 6, 22) }]}>
            <View style={styles.heroHeader}>
              <View style={styles.crestBadge}>
                <Compass color="#D4AF37" size={14} />
                <Text style={styles.appTitle}>ECHOES OF THE WILD • MUSEUM</Text>
              </View>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => Alert.alert('Expedition Log', 'All 3 wildlife museum exhibits are ready for AR & 3D exploration.')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Bell color="#FDE68A" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroSubTag}>SRI LANKAN WILDLIFE HERITAGE EXPEDITION</Text>
              <Text style={styles.heroHeadline}>Explore the Living Museum of the Wild</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Gold-Trimmed Expedition Search Bar */}
        <View style={styles.searchContainer}>
          <Search color="#FDE68A" size={19} style={styles.searchIconSpacing} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search museum species & rainforest habitats..."
            placeholderTextColor="rgba(253, 230, 138, 0.65)"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* ── Expedition Quick Actions ───────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <IconPillButton label="Scan Exhibit" icon={Scan} onPress={() => router.push('/scanner')} />
        <IconPillButton label="Archive" icon={Compass} onPress={() => router.navigate('/(tabs)/species')} />
        <IconPillButton label="3D Museum" icon={Box} onPress={() => router.push({ pathname: '/viewer/[id]', params: { id: 'leopard', mode: 'studio' } })} />
      </View>

      {/* ── Interactive 3D Museum & AR Expedition Banner ───────────────────── */}
      <View style={styles.expeditionBannerWrap}>
        <TouchableOpacity
          style={styles.expeditionBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/scanner')}
        >
          <View style={styles.expeditionBannerLeft}>
            <View style={styles.expeditionTagRow}>
              <Sparkles color="#D4AF37" size={13} />
              <Text style={styles.expeditionTagText}>FIELD EXPEDITION & 3D ROTUNDA</Text>
            </View>
            <Text style={styles.expeditionBannerTitle}>Scan Animal Photos for Live AR</Text>
            <Text style={styles.expeditionBannerDesc}>
              Scan the Sri Lankan Leopard, Purple-faced Langur, or Sri Lankan Pangolin photo to anchor 3D animations on your floor with real jungle & animal sounds.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Featured / Search results ─────────────────────────────────────── */}
      <View style={styles.section}>
        <SectionHeader
          title={isSearching ? 'Archive Matches' : 'Royal Museum Exhibits'}
          actionLabel={isSearching ? undefined : 'View All'}
          onActionPress={() => router.navigate('/(tabs)/species')}
        />
        {displayedSpecies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No species match "{searchText}"</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          >
            {displayedSpecies.map(item => (
              <SpeciesCard
                key={item.id}
                name={item.commonName}
                scientificName={item.scientificName}
                imageUrl={item.imageUrls.hero}
                status={item.conservationStatus}
                blurb={item.shortBlurb}
                onPress={() => router.push(`/species/${item.id}`)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Conservation news ─────────────────────────────────────────────── */}
      <View style={[styles.section, { paddingBottom: 40 }]}>
        <SectionHeader title="Expedition Dispatches" />
        {newsData.map(item => (
          <NewsListItem
            key={item.id}
            headline={item.headline}
            date={item.date}
            readTime={item.readTime}
            thumbnail={item.thumbnail}
            onPress={() => Linking.openURL(item.url).catch(() => {})}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroContainer: {
    marginBottom: 22,
  },
  heroImage: {
    width: '100%',
    height: 410,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 20, 18, 0.46)',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 44,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: ROUNDING.pill,
  },
  appTitle: {
    color: '#FDE68A',
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    marginBottom: 14,
  },
  heroSubTag: {
    color: '#FDE68A',
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  heroHeadline: {
    color: COLORS.white,
    fontFamily: FONTS.serif,
    fontSize: 36,
    lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16241E',
    marginHorizontal: 20,
    marginTop: -26,
    borderRadius: ROUNDING.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  searchIconSpacing: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontFamily: FONTS.sans,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  expeditionBannerWrap: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  expeditionBanner: {
    backgroundColor: '#15231D',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  expeditionBannerLeft: {
    gap: 4,
  },
  expeditionTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  expeditionTagText: {
    fontFamily: FONTS.sansBold,
    fontSize: 10,
    color: '#D4AF37',
    letterSpacing: 1.1,
  },
  expeditionBannerTitle: {
    fontFamily: FONTS.serif,
    fontSize: 18,
    color: '#FFFFFF',
  },
  expeditionBannerDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 18,
    marginTop: 2,
  },
  section: {
    marginBottom: 32,
  },
  carouselContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.sans,
    fontSize: SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
