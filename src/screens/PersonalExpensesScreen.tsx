// src/screens/PersonalExpensesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, FAB, Searchbar, Chip, Divider, Text, Menu, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';

import { usePersonalExpenses } from '../context/PersonalExpensesContext';
import { PersonalExpense, PersonalExpenseCategory } from '../types';

export default function PersonalExpensesScreen() {
  const navigation = useNavigation();
  const { expenses, deleteExpense } = usePersonalExpenses();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PersonalExpenseCategory | null>(null);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  
  // Filter expenses based on search query and selected category
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = searchQuery
      ? expense.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
      
    const matchesCategory = selectedCategory
      ? expense.category === selectedCategory
      : true;
      
    return matchesSearch && matchesCategory;
  });
  
  // Sort expenses by date
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortNewestFirst ? dateB - dateA : dateA - dateB;
  });
  
  // Group expenses by date
  const groupedExpenses: Record<string, PersonalExpense[]> = {};
  
  sortedExpenses.forEach(expense => {
    const dateKey = format(new Date(expense.date), 'yyyy-MM-dd');
    if (!groupedExpenses[dateKey]) {
      groupedExpenses[dateKey] = [];
    }
    groupedExpenses[dateKey].push(expense);
  });
  
  // Calculate total for filtered expenses
  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Handle category filter
  const handleCategorySelect = (category: PersonalExpenseCategory | null) => {
    setSelectedCategory(category);
    setFilterMenuVisible(false);
  };
  
  // Category color mapping
  const getCategoryColor = (category: PersonalExpenseCategory) => {
    switch (category) {
      case 'Gas': return '#FF9800'; // Orange
      case 'Food': return '#4CAF50'; // Green
      case 'Water': return '#2196F3'; // Blue
      case 'Entertainment': return '#9C27B0'; // Purple
      case 'Supplies': return '#F44336'; // Red
      case 'Tools': return '#795548'; // Brown
      case 'Repairs': return '#607D8B'; // Blue Grey
      case 'Other': return '#9E9E9E'; // Grey
      default: return '#9E9E9E';
    }
  };
  
  // Render category chip
  const renderCategoryChip = (category: PersonalExpenseCategory) => {
    const color = getCategoryColor(category);
    return (
      <Chip 
        style={[styles.categoryChip, { backgroundColor: `${color}20`, borderColor: color }]}
        textStyle={{ color, fontWeight: 'bold' }}
        onPress={() => setSelectedCategory(category === selectedCategory ? null : category)}
        selected={category === selectedCategory}
      >
        {category}
      </Chip>
    );
  };
  
  // Render expense item
  const renderExpenseItem = ({ item }: { item: PersonalExpense }) => {
    return (
      <TouchableOpacity 
        onPress={() => navigation.navigate('PersonalExpenseDetail' as never, { expenseId: item.id } as never)}
      >
        <Card style={styles.expenseCard}>
          <Card.Content>
            <View style={styles.expenseHeader}>
              <View style={styles.expenseInfo}>
                <Title style={styles.expenseTitle}>{item.description}</Title>
                {renderCategoryChip(item.category)}
              </View>
              <Text style={styles.expenseAmount}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
            <Paragraph style={styles.expenseDate}>
              {format(new Date(item.date), 'EEEE, MMMM d, yyyy')}
            </Paragraph>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };
  
  // Render date group header
  const renderDateHeader = (dateKey: string) => {
    const date = new Date(dateKey);
    const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
    const total = groupedExpenses[dateKey].reduce((sum, expense) => sum + expense.amount, 0);
    
    return (
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formattedDate}</Text>
        <Text style={styles.dateTotalText}>${total.toFixed(2)}</Text>
      </View>
    );
  };
  
  // Flatten grouped expenses for FlatList
  const sections = Object.keys(groupedExpenses).map(dateKey => ({
    date: dateKey,
    data: groupedExpenses[dateKey]
  }));
  
  // Create flat array for FlatList with section headers
  const flatData = sections.reduce((acc, section) => {
    acc.push({ id: `header-${section.date}`, type: 'header', date: section.date });
    section.data.forEach(expense => {
      acc.push({ id: expense.id, type: 'expense', expense });
    });
    return acc;
  }, [] as any[]);
  
  // Handle adding a new expense
  const handleAddExpense = () => {
    navigation.navigate('AddPersonalExpense' as never);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search expenses..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              size={24}
              onPress={() => setFilterMenuVisible(true)}
              color={selectedCategory ? getCategoryColor(selectedCategory) : '#757575'}
            />
          }
        >
          <Menu.Item
            onPress={() => handleCategorySelect(null)}
            title="All Categories"
            titleStyle={!selectedCategory ? styles.selectedFilter : undefined}
          />
          <Divider />
          <Menu.Item
            onPress={() => handleCategorySelect('Gas')}
            title="Gas"
            titleStyle={selectedCategory === 'Gas' ? { color: getCategoryColor('Gas'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Food')}
            title="Food"
            titleStyle={selectedCategory === 'Food' ? { color: getCategoryColor('Food'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Water')}
            title="Water"
            titleStyle={selectedCategory === 'Water' ? { color: getCategoryColor('Water'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Entertainment')}
            title="Entertainment"
            titleStyle={selectedCategory === 'Entertainment' ? { color: getCategoryColor('Entertainment'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Supplies')}
            title="Supplies"
            titleStyle={selectedCategory === 'Supplies' ? { color: getCategoryColor('Supplies'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Tools')}
            title="Tools"
            titleStyle={selectedCategory === 'Tools' ? { color: getCategoryColor('Tools'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Repairs')}
            title="Repairs"
            titleStyle={selectedCategory === 'Repairs' ? { color: getCategoryColor('Repairs'), fontWeight: 'bold' } : undefined}
          />
          <Menu.Item
            onPress={() => handleCategorySelect('Other')}
            title="Other"
            titleStyle={selectedCategory === 'Other' ? { color: getCategoryColor('Other'), fontWeight: 'bold' } : undefined}
          />
        </Menu>
      </View>
      
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {selectedCategory ? `${selectedCategory} Expenses` : 'Total Expenses'}:
              </Text>
              <Text style={styles.summaryValue}>${totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.sortRow}>
              <TouchableOpacity 
                style={styles.sortButton} 
                onPress={() => setSortNewestFirst(!sortNewestFirst)}
              >
                <Text>{sortNewestFirst ? 'Newest First' : 'Oldest First'}</Text>
                <IconButton 
                  icon={sortNewestFirst ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  style={styles.sortIcon}
                />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </View>
      
      {selectedCategory && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.filterLabel}>Filtered by:</Text>
          {renderCategoryChip(selectedCategory)}
          <IconButton
            icon="close"
            size={16}
            onPress={() => setSelectedCategory(null)}
            style={styles.clearFilterButton}
          />
        </View>
      )}
      
      {flatData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No expenses found</Text>
          <Text style={styles.emptySubtext}>
            Start tracking your daily expenses by adding them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderDateHeader(item.date);
            } else {
              return renderExpenseItem({ item: item.expense });
            }
          }}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddExpense}
        label="Add Expense"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
    elevation: 2,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    backgroundColor: 'white',
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336', // Red color for expenses
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIcon: {
    margin: 0,
    padding: 0,
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterLabel: {
    marginRight: 8,
    color: '#757575',
  },
  clearFilterButton: {
    margin: 0,
  },
  categoryChip: {
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#757575',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  dateText: {
    fontWeight: 'bold',
  },
  dateTotalText: {
    fontWeight: 'bold',
    color: '#F44336',
  },
  expenseCard: {
    marginBottom: 8,
    elevation: 1,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  expenseAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#F44336',
  },
  expenseDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  selectedFilter: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});