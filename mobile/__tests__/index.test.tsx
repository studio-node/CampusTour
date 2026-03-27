import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('expo-router', () => {
  const mockReplace = jest.fn();
  const mockPush = jest.fn();
  return {
    useRouter: () => ({
      replace: mockReplace,
      push: mockPush,
    }),
    __mockReplace: mockReplace,
    __mockPush: mockPush,
  };
});

jest.mock('@/services/supabase', () => ({
  authService: {
    isAuthenticated: jest.fn().mockResolvedValue(false),
    isStoredUserAmbassador: jest.fn().mockResolvedValue(false),
  },
  userTypeService: {
    setUserType: jest.fn().mockResolvedValue(undefined),
  },
  schoolService: {
    setSelectedSchool: jest.fn(),
  },
}));

jest.mock('@/services/appStateManager', () => ({
  appStateManager: {
    clearAllState: jest.fn().mockResolvedValue(undefined),
  },
}));

import TourTypeSelectionScreen from '@/app/index';
import { authService, userTypeService } from '@/services/supabase';

const expoRouterMock = jest.requireMock('expo-router') as {
  __mockReplace: jest.Mock;
  __mockPush: jest.Mock;
};

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <TourTypeSelectionScreen />
    </SafeAreaProvider>
  );
}

describe('TourTypeSelectionScreen', () => {
  beforeEach(() => {
    expoRouterMock.__mockReplace.mockClear();
    expoRouterMock.__mockPush.mockClear();
    jest.mocked(userTypeService.setUserType).mockClear();
    jest.mocked(authService.isAuthenticated).mockResolvedValue(false);
    jest.mocked(authService.isStoredUserAmbassador).mockResolvedValue(false);
  });

  it('redirects ambassadors to ambassador tours when stored session is ambassador', async () => {
    jest.mocked(authService.isAuthenticated).mockResolvedValue(true);
    jest.mocked(authService.isStoredUserAmbassador).mockResolvedValue(true);

    renderScreen();

    await waitFor(() => {
      expect(expoRouterMock.__mockReplace).toHaveBeenCalledWith('/ambassador-tours');
    });
  });

  it('continues self-guided flow to school selection', async () => {
    renderScreen();

    await screen.findByText('Choose your tour type');

    await userEvent.press(screen.getByText('Self-Guided'));
    await userEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(userTypeService.setUserType).toHaveBeenCalledWith('self-guided');
      expect(expoRouterMock.__mockPush).toHaveBeenCalledWith('/school-selection');
    });
  });
});
